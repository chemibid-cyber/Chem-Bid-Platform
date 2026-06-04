'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getGstProvider, type GstVerificationResult } from '@/lib/gst';
import { isValidGstinFormat, normalizeGstin, extractPan } from '@/lib/gstin';
import { validatePassword } from '@/lib/auth/password';
import { rateLimit } from '@/lib/ratelimit';
import { recordAudit, AuditAction } from '@/lib/audit';
import { sendEmail } from '@/lib/email';
import { resetPasswordEmail } from '@/lib/email/templates';

export type AuthFormState = { error?: string; success?: string } | null;

export interface GstPreview {
  ok: boolean;
  legalName?: string;
  address?: string;
  status?: 'verified' | 'pending';
  error?: string;
}

/** Step 1 of signup: verify a GSTIN and return the fetched (locked) identity. */
export async function verifyGstinAction(gstinRaw: string): Promise<GstPreview> {
  const gstin = normalizeGstin(gstinRaw);
  if (!isValidGstinFormat(gstin)) {
    return { ok: false, error: 'That GSTIN doesn’t look valid. Check the 15-character format.' };
  }
  const [existing] = await db.select().from(companies).where(eq(companies.gstin, gstin)).limit(1);
  if (existing) {
    return { ok: false, error: 'This GSTIN is already registered — contact your Admin or recover access.' };
  }
  try {
    const v = await getGstProvider().verify(gstin);
    if (!v.ok && v.status === 'rejected') {
      return { ok: false, error: v.message ?? 'GSTIN could not be verified.' };
    }
    return {
      ok: true,
      legalName: v.legalName,
      address: v.address,
      status: v.ok ? 'verified' : 'pending',
    };
  } catch {
    return {
      ok: true,
      status: 'pending',
      error: 'The GST service is slow right now — you can still register provisionally.',
    };
  }
}

const signupSchema = z.object({
  gstin: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  designation: z.string().optional(),
  password: z.string().min(1),
  consent: z.string().optional(),
});

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Please fill in all required fields correctly.' };
  const data = parsed.data;
  const gstin = normalizeGstin(data.gstin);

  if (data.consent !== 'on') {
    return { error: 'You must accept the Terms and Privacy Policy to continue.' };
  }
  if (!isValidGstinFormat(gstin)) {
    return { error: 'That GSTIN doesn’t look valid. Check the 15-character format.' };
  }
  const pw = validatePassword(data.password);
  if (!pw.ok) return { error: pw.errors.join(' ') };

  const [existing] = await db.select().from(companies).where(eq(companies.gstin, gstin)).limit(1);
  if (existing) {
    return {
      error: 'This GSTIN is already registered — contact your Admin or recover access.',
    };
  }

  // Verify via the swappable provider (mock for now).
  let verification: GstVerificationResult | null = null;
  let verificationStatus: 'verified' | 'pending' = 'pending';
  try {
    verification = await getGstProvider().verify(gstin);
    if (!verification.ok && verification.status === 'rejected') {
      return { error: verification.message ?? 'GSTIN could not be verified.' };
    }
    verificationStatus = verification.ok ? 'verified' : 'pending';
  } catch {
    // Provider downtime → provisional registration (FR-1.1 fallback).
    verification = null;
    verificationStatus = 'pending';
  }

  const svc = createServiceClient();
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true, // mock/dev build auto-confirms; toggle "Confirm email" in prod
    user_metadata: { first_name: data.firstName, last_name: data.lastName },
  });
  if (createErr || !created.user) {
    if (createErr?.message?.toLowerCase().includes('already')) {
      return { error: 'An account with this email already exists. Try logging in.' };
    }
    return { error: 'Could not create your account. Please try again.' };
  }
  const authId = created.user.id;

  try {
    const [company] = await db
      .insert(companies)
      .values({
        gstin,
        pan: verification?.pan || extractPan(gstin),
        legalName: verification?.legalName || `Pending verification — ${gstin}`,
        registeredAddress: verification?.address || '',
        verificationStatus,
        gstLastRefreshedAt: verification ? new Date() : null,
      })
      .returning();
    if (!company) throw new Error('company insert returned nothing');

    await db.insert(users).values({
      id: authId,
      companyId: company.id,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      designation: data.designation ?? null,
      canBuy: true,
      canSell: true,
      isAdmin: true,
      status: 'active',
      tncAcceptedAt: new Date(),
      dpdpConsentAt: new Date(),
    });

    await recordAudit({
      actorUserId: authId,
      entityType: 'company',
      entityId: company.id,
      action: AuditAction.CompanyCreated,
      snapshot: { gstin, verificationStatus, provider: getGstProvider().name },
    });
    await recordAudit({
      actorUserId: authId,
      entityType: 'user',
      entityId: authId,
      action: AuditAction.UserCreated,
      snapshot: { email: data.email, isAdmin: true },
    });
  } catch {
    // Roll back the orphaned auth user so the email can be reused.
    await svc.auth.admin.deleteUser(authId).catch(() => {});
    return { error: 'Could not finish setting up your company. Please try again.' };
  }

  // Establish the session cookie, then enter the app.
  const supabase = createClient();
  await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
  redirect('/dashboard');
}

export async function logInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };

  // Baseline lockout: 5 attempts / 15 min per email.
  const limit = rateLimit(`login:${email.toLowerCase()}`, 5, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: `Too many attempts. Try again in ${Math.ceil((limit.retryAfterSec ?? 0) / 60)} min.` };
  }

  const supabase = createClient();
  const { data: signin, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !signin.user) return { error: 'Invalid email or password.' };

  // Block disabled members at the door.
  const [profile] = await db.select().from(users).where(eq(users.id, signin.user.id)).limit(1);
  if (profile?.status === 'disabled') {
    await supabase.auth.signOut();
    return { error: 'This account has been disabled. Contact your company Admin.' };
  }

  redirect('/dashboard');
}

export async function logOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function requestResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get('email') ?? '');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  // Generate a recovery link and deliver via Resend (keeps email on one vendor).
  try {
    const svc = createServiceClient();
    const { data, error } = await svc.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/reset-password` },
    });
    if (!error && data.properties?.action_link) {
      const tmpl = resetPasswordEmail({ resetUrl: data.properties.action_link });
      await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });
    }
  } catch {
    /* never reveal whether an email exists */
  }
  // Always report success (no account enumeration).
  return { success: 'If that email is registered, a reset link is on its way.' };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get('password') ?? '');
  const pw = validatePassword(password);
  if (!pw.ok) return { error: pw.errors.join(' ') };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: 'Your reset link has expired. Request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: 'Could not update password. The link may have expired.' };

  await recordAudit({
    actorUserId: auth.user.id,
    entityType: 'user',
    entityId: auth.user.id,
    action: 'user.password_reset',
  });
  redirect('/dashboard');
}
