'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, ne, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  serviceProviderProfiles,
  serviceRequests,
  serviceQuotes,
  companies,
  users,
  notifications,
  type ServiceRequest,
} from '@/lib/db/schema';
import { requireUser } from '@/lib/auth/session';
import { canAccessOwned } from '@/lib/auth/scope';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { serviceInquiryEmail, serviceQuoteEmail, serviceAcceptedEmail } from '@/lib/email/templates';
import {
  VEHICLE_TYPE_VALUES,
  PACKING_TYPE_VALUES,
  VEHICLE_TYPE_LABEL,
  PACKING_TYPE_LABEL,
  SERVICE_KIND_LABEL,
} from '@/lib/services/constants';
import { transportTotal, packingTotal, validateQuote, providerMatchesRequest } from '@/lib/services/totals';
import { round2 } from '@/lib/pricing';
import { PAYMENT_TERMS_LABEL } from '@/lib/format';

export type ServiceFormState = { error?: string; success?: string } | null;

const TERMS = ['advance', 'net15', 'net30', 'net45', 'lc'] as const;

/** One-line job summary used across emails + notifications. */
export async function summarizeRequest(r: ServiceRequest): Promise<string> {
  if (r.kind === 'transport') {
    const vehicles = r.vehicleTypes.map((v) => VEHICLE_TYPE_LABEL[v] ?? v).join('/') || 'Any vehicle';
    return `${r.materialName ?? 'Material'} · ${r.totalQtyKg ?? '?'} kg · ${vehicles}`;
  }
  const type = r.packingType ? PACKING_TYPE_LABEL[r.packingType] ?? r.packingType : 'Packing';
  return `${type} · ${r.quantityPieces ?? '?'} pcs`;
}

// ── Provider profile ──────────────────────────────────────────────────────────

export async function upsertProviderProfileAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  if (!user.isAdmin) return { error: 'Only an Admin can manage your service-provider profile.' };
  if (company.verificationStatus !== 'verified') {
    return { error: 'Your GSTIN must be verified before offering services.' };
  }

  const isTransporter = formData.get('isTransporter') === 'on';
  const isPackingSupplier = formData.get('isPackingSupplier') === 'on';
  const vehicleTypes = formData
    .getAll('vehicleTypes')
    .map(String)
    .filter((v) => VEHICLE_TYPE_VALUES.includes(v));
  const packingTypes = formData
    .getAll('packingTypes')
    .map(String)
    .filter((p) => PACKING_TYPE_VALUES.includes(p));

  if (isTransporter && vehicleTypes.length === 0) {
    return { error: 'Pick at least one vehicle type you operate.' };
  }
  if (isPackingSupplier && packingTypes.length === 0) {
    return { error: 'Pick at least one packing type you supply.' };
  }

  await db
    .insert(serviceProviderProfiles)
    .values({
      companyId: company.id,
      contactUserId: user.id,
      isTransporter,
      vehicleTypes,
      isPackingSupplier,
      packingTypes,
      active: isTransporter || isPackingSupplier,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: serviceProviderProfiles.companyId,
      set: {
        contactUserId: user.id,
        isTransporter,
        vehicleTypes,
        isPackingSupplier,
        packingTypes,
        active: isTransporter || isPackingSupplier,
        updatedAt: new Date(),
      },
    });

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_profile',
    entityId: company.id,
    action: AuditAction.ServiceProfileUpserted,
    snapshot: { isTransporter, vehicleTypes, isPackingSupplier, packingTypes },
  });

  revalidatePath('/services');
  revalidatePath('/services/providers');
  return {
    success:
      isTransporter || isPackingSupplier
        ? 'Service profile saved — matching inquiries will reach you by email the moment they publish.'
        : 'Service profile switched off.',
  };
}

// ── Inquiry creation ──────────────────────────────────────────────────────────

const transportSchema = z.object({
  materialName: z.string().min(1, 'Material name is required.'),
  totalQtyKg: z.string().min(1, 'Total quantity (kg) is required.'),
  lotQtyKg: z.string().optional(),
  pickupAddress: z.string().min(1, 'Pickup location is required.'),
  dropAddress: z.string().min(1, 'Drop location is required.'),
  pickupPlaceId: z.string().optional(),
  dropPlaceId: z.string().optional(),
  paymentTerms: z.enum(TERMS),
  description: z.string().optional(),
});

export async function createTransportRequestAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  if (company.verificationStatus !== 'verified') {
    return { error: 'Your GSTIN must be verified before posting a service inquiry.' };
  }

  const parsed = transportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please complete the form.' };
  const data = parsed.data;

  const totalQty = Number(data.totalQtyKg);
  if (!Number.isFinite(totalQty) || totalQty <= 0) {
    return { error: 'Total quantity must be greater than 0 kg (gross: chemical + packing weight).' };
  }
  const lotQty = data.lotQtyKg?.trim() ? Number(data.lotQtyKg) : null;
  if (lotQty != null && (!Number.isFinite(lotQty) || lotQty <= 0 || lotQty > totalQty)) {
    return { error: 'One-lot quantity must be greater than 0 and at most the total quantity.' };
  }

  const vehicleTypes = formData
    .getAll('vehicleTypes')
    .map(String)
    .filter((v) => VEHICLE_TYPE_VALUES.includes(v));
  if (vehicleTypes.length === 0) return { error: 'Select at least one vehicle type.' };

  // Spec §3 hard block: when Google Places is configured, addresses must be
  // PICKED from the suggestions (typed-only strings aren't routable).
  if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    if (!data.pickupPlaceId?.trim() || !data.dropPlaceId?.trim()) {
      return {
        error:
          'Pick both the pickup and drop addresses from the Google suggestions — typed text alone can send trucks to un-routable destinations.',
      };
    }
  }

  const materialName = data.materialName.trim();
  const pickupAddress = data.pickupAddress.trim();
  const dropAddress = data.dropAddress.trim();

  // #39 server-side duplicate prevention: reject an identical OPEN transport
  // inquiry from the same needer+user posted in the last ~5 minutes (e.g. a
  // double-submit or impatient re-click). Defining fields: material + gross qty
  // + pickup + drop. Complements the client SubmitButton guard.
  const [dupe] = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.neederCompanyId, company.id),
        eq(serviceRequests.neederUserId, user.id),
        eq(serviceRequests.kind, 'transport'),
        eq(serviceRequests.status, 'open'),
        eq(serviceRequests.materialName, materialName),
        eq(serviceRequests.totalQtyKg, String(totalQty)),
        eq(serviceRequests.pickupAddress, pickupAddress),
        eq(serviceRequests.dropAddress, dropAddress),
        gt(serviceRequests.createdAt, new Date(Date.now() - 5 * 60 * 1000)),
      ),
    )
    .limit(1);
  if (dupe) return { error: 'You just posted an identical request — check your open inquiries.' };

  const [request] = await db
    .insert(serviceRequests)
    .values({
      kind: 'transport',
      neederCompanyId: company.id,
      neederUserId: user.id,
      paymentTerms: data.paymentTerms,
      description: data.description?.trim() || null,
      materialName,
      totalQtyKg: String(totalQty),
      lotQtyKg: lotQty != null ? String(lotQty) : null,
      vehicleTypes,
      pickupAddress,
      dropAddress,
      pickupPlaceId: data.pickupPlaceId?.trim() || null,
      dropPlaceId: data.dropPlaceId?.trim() || null,
    })
    .returning();
  if (!request) return { error: 'Could not create the inquiry. Please try again.' };

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_request',
    entityId: request.id,
    action: AuditAction.ServiceRequestCreated,
    snapshot: { kind: 'transport', materialName: request.materialName, totalQtyKg: request.totalQtyKg, vehicleTypes },
  });

  const notified = await broadcastInquiry(request, company.legalName);
  redirect(`/services/${request.id}?published=${notified}`);
}

const packingSchema = z.object({
  packingType: z.string().min(1, 'Pick a packing type.'),
  packingTypeOther: z.string().optional(),
  condition: z.enum(['new', 'used', 'other']),
  quantityPieces: z.string().min(1, 'Quantity (pieces) is required.'),
  materialSpec: z.string().optional(),
  weightPerPiece: z.string().optional(),
  logisticsBasis: z.enum(['delivered', 'exworks']),
  paymentTerms: z.enum(TERMS),
  description: z.string().optional(),
});

export async function createPackingRequestAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  if (company.verificationStatus !== 'verified') {
    return { error: 'Your GSTIN must be verified before posting a service inquiry.' };
  }

  const parsed = packingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Please complete the form.' };
  const data = parsed.data;

  // "Other" = a free-text packing type the standard list doesn't cover. Store
  // the typed value directly (packing_type is a free-text column) so it renders
  // as-is everywhere and reaches every packing supplier — providerMatchesRequest
  // treats any non-standard type as a match-all.
  let packingType = data.packingType;
  if (packingType === 'other') {
    const custom = data.packingTypeOther?.trim();
    if (!custom) return { error: 'Describe the packing type you need.' };
    if (custom.length > 80) return { error: 'Packing type is too long (max 80 characters).' };
    packingType = custom;
  } else if (!PACKING_TYPE_VALUES.includes(packingType)) {
    return { error: 'Pick a valid packing type.' };
  }
  const pieces = Number(data.quantityPieces);
  if (!Number.isInteger(pieces) || pieces <= 0) {
    return { error: 'Quantity must be a whole number of pieces, greater than 0.' };
  }

  const materialSpec = data.materialSpec?.trim() || null;

  // #39 server-side duplicate prevention: reject an identical OPEN packing
  // inquiry from the same needer+user posted in the last ~5 minutes. Defining
  // fields: packing type + piece count + spec. Complements the client guard.
  const [dupe] = await db
    .select({ id: serviceRequests.id })
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.neederCompanyId, company.id),
        eq(serviceRequests.neederUserId, user.id),
        eq(serviceRequests.kind, 'packing'),
        eq(serviceRequests.status, 'open'),
        eq(serviceRequests.packingType, packingType),
        eq(serviceRequests.quantityPieces, pieces),
        materialSpec === null
          ? isNull(serviceRequests.materialSpec)
          : eq(serviceRequests.materialSpec, materialSpec),
        gt(serviceRequests.createdAt, new Date(Date.now() - 5 * 60 * 1000)),
      ),
    )
    .limit(1);
  if (dupe) return { error: 'You just posted an identical request — check your open inquiries.' };

  const [request] = await db
    .insert(serviceRequests)
    .values({
      kind: 'packing',
      neederCompanyId: company.id,
      neederUserId: user.id,
      paymentTerms: data.paymentTerms,
      description: data.description?.trim() || null,
      packingType,
      condition: data.condition,
      quantityPieces: pieces,
      materialSpec,
      weightPerPiece: data.weightPerPiece?.trim() || null,
      logisticsBasis: data.logisticsBasis,
    })
    .returning();
  if (!request) return { error: 'Could not create the inquiry. Please try again.' };

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_request',
    entityId: request.id,
    action: AuditAction.ServiceRequestCreated,
    snapshot: { kind: 'packing', packingType: request.packingType, quantityPieces: pieces },
  });

  const notified = await broadcastInquiry(request, company.legalName);
  redirect(`/services/${request.id}?published=${notified}`);
}

/** Instant email alerts: notify every active provider matching this inquiry. */
async function broadcastInquiry(request: ServiceRequest, neederName: string): Promise<number> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const profiles = await db
    .select({
      companyId: serviceProviderProfiles.companyId,
      contactUserId: serviceProviderProfiles.contactUserId,
      contactEmail: users.email,
      active: serviceProviderProfiles.active,
      isTransporter: serviceProviderProfiles.isTransporter,
      vehicleTypes: serviceProviderProfiles.vehicleTypes,
      isPackingSupplier: serviceProviderProfiles.isPackingSupplier,
      packingTypes: serviceProviderProfiles.packingTypes,
      suspended: companies.suspended,
    })
    .from(serviceProviderProfiles)
    .innerJoin(users, eq(serviceProviderProfiles.contactUserId, users.id))
    .innerJoin(companies, eq(serviceProviderProfiles.companyId, companies.id))
    .where(ne(serviceProviderProfiles.companyId, request.neederCompanyId));

  const matching = profiles.filter((p) => !p.suspended && providerMatchesRequest(p, request));
  if (matching.length === 0) return 0;

  const summary = await summarizeRequest(request);
  const kindLabel = SERVICE_KIND_LABEL[request.kind] ?? request.kind;
  const terms = PAYMENT_TERMS_LABEL[request.paymentTerms] ?? request.paymentTerms;

  await db.insert(notifications).values(
    matching.map((p) => ({
      userId: p.contactUserId,
      type: 'service.inquiry',
      payload: { requestId: request.id, kind: request.kind, summary },
    })),
  );
  await Promise.all(
    matching.map((p) => {
      const tmpl = serviceInquiryEmail({
        kindLabel,
        neederName,
        summary,
        paymentTerms: terms,
        viewUrl: `${appUrl}/services/${request.id}`,
      });
      return sendEmail({ to: p.contactEmail, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
    }),
  );
  return matching.length;
}

export async function cancelServiceRequestAction(requestId: string): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.neederCompanyId, company.id)))
    .limit(1);
  if (!request) return { error: 'Inquiry not found.' };
  if (!canAccessOwned(request.neederUserId, user)) return { error: 'Inquiry not found.' };
  if (request.status !== 'open') return { error: 'Only an open inquiry can be cancelled.' };

  await db.update(serviceRequests).set({ status: 'cancelled' }).where(eq(serviceRequests.id, requestId));

  // Tell providers who quoted.
  const quoted = await db
    .select({ providerUserId: serviceQuotes.providerUserId })
    .from(serviceQuotes)
    .where(and(eq(serviceQuotes.requestId, requestId), eq(serviceQuotes.status, 'active')));
  if (quoted.length > 0) {
    const summary = await summarizeRequest(request);
    await db.insert(notifications).values(
      quoted.map((q) => ({
        userId: q.providerUserId,
        type: 'service.cancelled',
        payload: { requestId, kind: request.kind, summary },
      })),
    );
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_request',
    entityId: requestId,
    action: AuditAction.ServiceRequestCancelled,
  });
  revalidatePath('/services');
  revalidatePath(`/services/${requestId}`);
  return { success: 'Inquiry cancelled.' };
}

// ── Quotes ────────────────────────────────────────────────────────────────────

const quoteSchema = z.object({
  requestId: z.string().uuid(),
  baseRate: z.string().min(1),
  taxAmount: z.string().optional(),
  altTermsToggle: z.string().optional(),
  altPaymentTerms: z.string().optional(),
  note: z.string().optional(),
});

export async function submitServiceQuoteAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  if (company.verificationStatus !== 'verified') {
    return { error: 'Your GSTIN must be verified before quoting.' };
  }

  const parsed = quoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please complete the quote form.' };
  const data = parsed.data;

  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, data.requestId))
    .limit(1);
  if (!request) return { error: 'Inquiry not found.' };
  if (request.status !== 'open') return { error: 'This inquiry is no longer open.' };
  if (request.neederCompanyId === company.id) return { error: 'You cannot quote your own inquiry.' };

  // Quoting requires a matching, active provider profile.
  const [profile] = await db
    .select()
    .from(serviceProviderProfiles)
    .where(eq(serviceProviderProfiles.companyId, company.id))
    .limit(1);
  if (!profile || !providerMatchesRequest(profile, request)) {
    return {
      error:
        request.kind === 'transport'
          ? 'Register as a transporter (with this vehicle type) in your service profile before quoting.'
          : 'Register as a packing supplier (with this packing type) in your service profile before quoting.',
    };
  }

  // #27: money values store at 2 decimals regardless of input; the total is
  // then computed from the rounded base rate + tax (matches the displayed total).
  const baseRate = round2(Number(data.baseRate));
  const taxAmount = round2(Number(data.taxAmount?.trim() ? data.taxAmount : '0'));
  const check = validateQuote(baseRate, taxAmount);
  if (!check.ok) return { error: check.errors.join(' ') };

  const qty = request.kind === 'transport' ? Number(request.totalQtyKg ?? 0) : Number(request.quantityPieces ?? 0);
  const total =
    request.kind === 'transport' ? transportTotal(baseRate, qty, taxAmount) : packingTotal(baseRate, qty, taxAmount);

  const wantsAltTerms = data.altTermsToggle === 'on';
  const altPaymentTerms = wantsAltTerms ? (data.altPaymentTerms ?? '').trim() : '';
  if (wantsAltTerms && !altPaymentTerms) {
    return { error: 'Type your alternative payment terms, or untick the alternative-terms option.' };
  }

  const [existing] = await db
    .select({ id: serviceQuotes.id, status: serviceQuotes.status })
    .from(serviceQuotes)
    .where(and(eq(serviceQuotes.requestId, request.id), eq(serviceQuotes.providerCompanyId, company.id)))
    .limit(1);

  if (existing) {
    await db
      .update(serviceQuotes)
      .set({
        providerUserId: user.id,
        baseRate: String(baseRate),
        taxAmount: String(taxAmount),
        total: String(total),
        altPaymentTerms: altPaymentTerms || null,
        note: data.note?.trim() || null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(serviceQuotes.id, existing.id));
  } else {
    await db.insert(serviceQuotes).values({
      requestId: request.id,
      providerCompanyId: company.id,
      providerUserId: user.id,
      baseRate: String(baseRate),
      taxAmount: String(taxAmount),
      total: String(total),
      altPaymentTerms: altPaymentTerms || null,
      note: data.note?.trim() || null,
      status: 'active',
    });
  }

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_quote',
    entityId: request.id,
    action: AuditAction.ServiceQuoteSubmitted,
    snapshot: { baseRate, taxAmount, total, altPaymentTerms: altPaymentTerms || null, revision: Boolean(existing) },
  });

  // Open identity: the needer immediately sees who quoted.
  const summary = await summarizeRequest(request);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  await db.insert(notifications).values({
    userId: request.neederUserId,
    type: 'service.quote',
    payload: { requestId: request.id, kind: request.kind, summary, providerName: company.legalName, total },
  });
  const [neederUser] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, request.neederUserId))
    .limit(1);
  if (neederUser?.email) {
    const tmpl = serviceQuoteEmail({
      providerName: company.legalName,
      kindLabel: SERVICE_KIND_LABEL[request.kind] ?? request.kind,
      summary,
      total: total.toLocaleString('en-IN'),
      viewUrl: `${appUrl}/services/${request.id}`,
    });
    await sendEmail({ to: neederUser.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
  }

  revalidatePath(`/services/${request.id}`);
  return { success: existing ? 'Quote revised.' : 'Quote submitted — the needer can see your full company profile.' };
}

export async function withdrawServiceQuoteAction(requestId: string): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  const [quote] = await db
    .select()
    .from(serviceQuotes)
    .where(and(eq(serviceQuotes.requestId, requestId), eq(serviceQuotes.providerCompanyId, company.id)))
    .limit(1);
  if (!quote) return { error: 'Quote not found.' };
  if (quote.status !== 'active') return { error: 'Only an active quote can be withdrawn.' };

  await db
    .update(serviceQuotes)
    .set({ status: 'withdrawn', updatedAt: new Date() })
    .where(eq(serviceQuotes.id, quote.id));
  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_quote',
    entityId: quote.id,
    action: AuditAction.ServiceQuoteWithdrawn,
  });
  revalidatePath(`/services/${requestId}`);
  return { success: 'Quote withdrawn.' };
}

export async function acceptServiceQuoteAction(
  requestId: string,
  quoteId: string,
): Promise<ServiceFormState> {
  const { user, company } = await requireUser();
  const [request] = await db
    .select()
    .from(serviceRequests)
    .where(and(eq(serviceRequests.id, requestId), eq(serviceRequests.neederCompanyId, company.id)))
    .limit(1);
  if (!request) return { error: 'Inquiry not found.' };
  if (!canAccessOwned(request.neederUserId, user)) return { error: 'Inquiry not found.' };
  if (request.status !== 'open') return { error: 'This inquiry is no longer open.' };

  const [quote] = await db
    .select()
    .from(serviceQuotes)
    .where(and(eq(serviceQuotes.id, quoteId), eq(serviceQuotes.requestId, requestId), eq(serviceQuotes.status, 'active')))
    .limit(1);
  if (!quote) return { error: 'That quote is no longer active.' };

  await db.transaction(async (tx) => {
    await tx
      .update(serviceQuotes)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(serviceQuotes.id, quote.id));
    await tx
      .update(serviceQuotes)
      .set({ status: 'declined', updatedAt: new Date() })
      .where(
        and(eq(serviceQuotes.requestId, requestId), ne(serviceQuotes.id, quote.id), eq(serviceQuotes.status, 'active')),
      );
    await tx
      .update(serviceRequests)
      .set({ status: 'closed', acceptedQuoteId: quote.id })
      .where(eq(serviceRequests.id, requestId));
  });

  await recordAudit({
    actorUserId: user.id,
    entityType: 'service_quote',
    entityId: quote.id,
    action: AuditAction.ServiceQuoteAccepted,
    snapshot: { requestId, total: quote.total, providerCompanyId: quote.providerCompanyId },
  });

  const summary = await summarizeRequest(request);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  await db.insert(notifications).values({
    userId: quote.providerUserId,
    type: 'service.accepted',
    payload: { requestId, kind: request.kind, summary, total: quote.total },
  });
  const [providerUser] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, quote.providerUserId))
    .limit(1);
  if (providerUser?.email) {
    const tmpl = serviceAcceptedEmail({
      neederName: company.legalName,
      kindLabel: SERVICE_KIND_LABEL[request.kind] ?? request.kind,
      summary,
      total: Number(quote.total).toLocaleString('en-IN'),
      viewUrl: `${appUrl}/services/${requestId}`,
    });
    await sendEmail({ to: providerUser.email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
  }

  revalidatePath(`/services/${requestId}`);
  revalidatePath('/services');
  return { success: 'Quote accepted — the request is closed and archived in your Service History.' };
}
