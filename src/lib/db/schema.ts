/**
 * Drizzle schema — the data spine for the B2B Chemical Auction Platform.
 *
 * Conventions:
 *  - Every table has `created_at` (timestamptz, default now()).
 *  - `users.id` and `operators.auth_user_id` equal the Supabase `auth.users.id`
 *    (UUID) so app profiles map 1:1 to auth identities.
 *  - Money/rates are `numeric` (never float) — see lib/pricing.ts for math.
 *  - `audit_log` is APPEND-ONLY (enforced by RLS in the Supabase policy file).
 *  - Nothing is hard-deleted; lifecycle is modelled with status enums.
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

// ── Enums ────────────────────────────────────────────────────────────────────
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'verified',
  'rejected',
]);
export const userStatusEnum = pgEnum('user_status', ['invited', 'active', 'disabled']);
export const profileTypeEnum = pgEnum('profile_type', ['sales', 'purchase']);
export const gradeEnum = pgEnum('grade', ['pure', 'distilled', 'trade']);
export const casStatusEnum = pgEnum('cas_status', ['found', 'not_found', 'ambiguous']);
export const unitEnum = pgEnum('unit', ['kg', 'mt', 'l']);
export const logisticsBasisEnum = pgEnum('logistics_basis', ['delivered', 'exworks']);
export const privacyModeEnum = pgEnum('privacy_mode', ['all', 'registered']);
export const auctionStatusEnum = pgEnum('auction_status', [
  'draft',
  'active',
  'awaiting_decision',
  'closed',
  'unsuccessful',
  'cancelled',
]);
export const auctionStageEnum = pgEnum('auction_stage', ['stage1', 'stage2', 'closed']);
export const partnerStatusEnum = pgEnum('partner_status', ['active', 'pending', 'declined']);
export const paymentTermsEnum = pgEnum('payment_terms', [
  'advance',
  'net15',
  'net30',
  'net45',
  'lc',
]);
export const stage2ActionEnum = pgEnum('stage2_action', ['accept', 'reject', 'final']);
export const bidStatusEnum = pgEnum('bid_status', [
  'active',
  'withdrawn',
  'expired',
  'won',
  'lost',
]);
export const shareStatusEnum = pgEnum('share_status', ['active', 'expired', 'withdrawn']);
export const blockScopeEnum = pgEnum('block_scope', ['this_cas', 'all']);
export const dealStatusEnum = pgEnum('deal_status', ['confirmed', 'disputed']);
export const disputeStatusEnum = pgEnum('dispute_status', ['open', 'resolved']);
export const sellerGateEnum = pgEnum('seller_gate', ['notified', 'accepted', 'ignored', 'blocked']);
// ── Service Providers Hub (open-identity transport + packing layer) ───────────
export const serviceKindEnum = pgEnum('service_kind', ['transport', 'packing']);
export const serviceRequestStatusEnum = pgEnum('service_request_status', [
  'open',
  'closed',
  'cancelled',
]);
export const serviceQuoteStatusEnum = pgEnum('service_quote_status', [
  'active',
  'withdrawn',
  'accepted',
  'declined',
]);
export const packingConditionEnum = pgEnum('packing_condition', ['new', 'used', 'other']);
// ── Contact verification (email + phone OTP) ──────────────────────────────────
export const otpChannelEnum = pgEnum('otp_channel', ['email', 'phone']);

// ── companies ────────────────────────────────────────────────────────────────
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  gstin: text('gstin').notNull().unique(),
  pan: text('pan').notNull(), // GSTIN chars 3–12
  legalName: text('legal_name').notNull(), // locked, GST-sourced — never user-editable
  registeredAddress: text('registered_address').notNull(),
  verificationStatus: verificationStatusEnum('verification_status')
    .notNull()
    .default('pending'),
  completionScore: integer('completion_score').notNull().default(100),
  suspended: boolean('suspended').notNull().default(false),
  gstLastRefreshedAt: timestamp('gst_last_refreshed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── users (one row per auth user; capability flags, not separate logins) ──────
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = supabase auth.users.id
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  phone: text('phone'),
  phoneVerifiedAt: timestamp('phone_verified_at', { withTimezone: true }),
  designation: text('designation'),
  team: text('team'), // replaces the killed "department" concept
  canBuy: boolean('can_buy').notNull().default(false),
  canSell: boolean('can_sell').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  status: userStatusEnum('status').notNull().default('active'),
  // DPDP + email prefs
  tncAcceptedAt: timestamp('tnc_accepted_at', { withTimezone: true }),
  dpdpConsentAt: timestamp('dpdp_consent_at', { withTimezone: true }),
  marketingOptOut: boolean('marketing_opt_out').notNull().default(false),
  deletionRequestedAt: timestamp('deletion_requested_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── operators (platform staff — Two Clicks Media; NOT company members) ────────
export const operators = pgTable('operators', {
  id: uuid('id').primaryKey().defaultRandom(),
  authUserId: uuid('auth_user_id').notNull().unique(), // = supabase auth.users.id
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── catalog_items ─────────────────────────────────────────────────────────────
export const catalogItems = pgTable(
  'catalog_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    ownerUserId: uuid('owner_user_id')
      .notNull()
      .references(() => users.id),
    profileType: profileTypeEnum('profile_type').notNull(),
    casNumber: text('cas_number'), // null for pure mixtures
    name: text('name').notNull(),
    nameVerified: boolean('name_verified').notNull().default(false),
    isMixture: boolean('is_mixture').notNull().default(false),
    mixtureText: text('mixture_text'),
    roles: text('roles').array().notNull().default([]), // mfr | dist | trader
    grade: gradeEnum('grade').notNull(),
    minPurity: numeric('min_purity'),
    delisted: boolean('delisted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // One CAS per company per profile type (the cross-user uniqueness rule).
    uniqCasPerProfile: unique('uniq_cas_per_profile').on(
      t.companyId,
      t.casNumber,
      t.profileType,
    ),
    byCompany: index('catalog_company_idx').on(t.companyId),
    byCas: index('catalog_cas_idx').on(t.casNumber),
  }),
);

// ── cas_cache ─────────────────────────────────────────────────────────────────
export const casCache = pgTable('cas_cache', {
  casNumber: text('cas_number').primaryKey(),
  resolvedName: text('resolved_name'),
  cid: text('cid'),
  status: casStatusEnum('status').notNull(),
  candidates: jsonb('candidates'), // [{cid,name}] for the ambiguous (2+) case
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── auctions ──────────────────────────────────────────────────────────────────
export const auctions = pgTable(
  'auctions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    buyerCompanyId: uuid('buyer_company_id')
      .notNull()
      .references(() => companies.id),
    buyerUserId: uuid('buyer_user_id')
      .notNull()
      .references(() => users.id),
    casNumber: text('cas_number'),
    name: text('name').notNull(),
    quantity: numeric('quantity').notNull(),
    unit: unitEnum('unit').notNull(),
    minPurity: numeric('min_purity'),
    packing: text('packing'),
    deliveryAddress: text('delivery_address').notNull(),
    logisticsBasis: logisticsBasisEnum('logistics_basis').notNull(),
    supplierFilter: text('supplier_filter').array().notNull().default([]),
    specFileUrl: text('spec_file_url'),
    remarks: text('remarks'),
    privacyMode: privacyModeEnum('privacy_mode').notNull().default('all'),
    blind: boolean('blind').notNull().default(true),
    status: auctionStatusEnum('status').notNull().default('draft'),
    stage: auctionStageEnum('stage').notNull().default('stage1'),
    closesAt: timestamp('closes_at', { withTimezone: true }).notNull(),
    extendedOnce: boolean('extended_once').notNull().default(false),
    // The buyer's single Stage-2 counter, expressed on the MATERIAL (basic) rate.
    stage2Target: numeric('stage2_target'),
    stage2ClosesAt: timestamp('stage2_closes_at', { withTimezone: true }),
    stage2UrgencySent: boolean('stage2_urgency_sent').notNull().default(false),
    awaitingSince: timestamp('awaiting_since', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byBuyer: index('auctions_buyer_idx').on(t.buyerCompanyId),
    byStatus: index('auctions_status_idx').on(t.status),
    byCloses: index('auctions_closes_idx').on(t.closesAt),
  }),
);

// ── registered_partners ───────────────────────────────────────────────────────
export const registeredPartners = pgTable('registered_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  buyerCompanyId: uuid('buyer_company_id')
    .notNull()
    .references(() => companies.id),
  partnerGstin: text('partner_gstin').notNull(),
  casNumber: text('cas_number').notNull(),
  status: partnerStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── bids (ALWAYS full quantity — no partial-qty column exists, by design) ──────
export const bids = pgTable(
  'bids',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    auctionId: uuid('auction_id')
      .notNull()
      .references(() => auctions.id),
    sellerCompanyId: uuid('seller_company_id')
      .notNull()
      .references(() => companies.id),
    sellerUserId: uuid('seller_user_id')
      .notNull()
      .references(() => users.id),
    gateState: sellerGateEnum('gate_state').notNull().default('notified'),
    // Split pricing: total = material (basic) + freight + tax, all ₹/unit.
    stage1Basic: numeric('stage1_basic'),
    stage1Freight: numeric('stage1_freight'),
    stage1Tax: numeric('stage1_tax'),
    stage1Total: numeric('stage1_total'),
    paymentTerms: paymentTermsEnum('payment_terms'),
    leadTimeDays: integer('lead_time_days'),
    coaFileUrl: text('coa_file_url'),
    coaOnDispatch: boolean('coa_on_dispatch').notNull().default(false),
    // Stage-2 negotiates on the MATERIAL (basic) rate; freight + tax carry over
    // from Stage-1. stage2_rate stores the seller's Stage-2 MATERIAL rate.
    stage2Rate: numeric('stage2_rate'),
    stage2Action: stage2ActionEnum('stage2_action'),
    status: bidStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // one bid per seller company per auction
    uniqSellerAuction: unique('uniq_seller_auction').on(t.auctionId, t.sellerCompanyId),
    byAuction: index('bids_auction_idx').on(t.auctionId),
    bySeller: index('bids_seller_idx').on(t.sellerCompanyId),
  }),
);

// ── proactive_shares (seller-initiated; schema present, negotiation deferred) ──
export const proactiveShares = pgTable('proactive_shares', {
  id: uuid('id').primaryKey().defaultRandom(),
  sellerCompanyId: uuid('seller_company_id')
    .notNull()
    .references(() => companies.id),
  sellerUserId: uuid('seller_user_id')
    .notNull()
    .references(() => users.id),
  casNumber: text('cas_number'),
  name: text('name').notNull(),
  quantity: numeric('quantity').notNull(),
  unit: unitEnum('unit').notNull(),
  grade: gradeEnum('grade').notNull(),
  minPurity: numeric('min_purity'),
  basicRate: numeric('basic_rate'),
  freightRate: numeric('freight_rate'),
  packing: text('packing'),
  specFileUrl: text('spec_file_url'),
  privacyMode: privacyModeEnum('privacy_mode').notNull().default('all'),
  validUntil: timestamp('valid_until', { withTimezone: true }),
  status: shareStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── blocks ────────────────────────────────────────────────────────────────────
export const blocks = pgTable('blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  blockerCompanyId: uuid('blocker_company_id')
    .notNull()
    .references(() => companies.id),
  blockedCompanyId: uuid('blocked_company_id')
    .notNull()
    .references(() => companies.id),
  casNumber: text('cas_number'), // null = all
  scope: blockScopeEnum('scope').notNull().default('this_cas'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── deals (Deal Confirmation Record — NOT "legally binding") ───────────────────
export const deals = pgTable('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  auctionId: uuid('auction_id')
    .notNull()
    .references(() => auctions.id),
  bidId: uuid('bid_id')
    .notNull()
    .references(() => bids.id),
  buyerCompanyId: uuid('buyer_company_id')
    .notNull()
    .references(() => companies.id),
  sellerCompanyId: uuid('seller_company_id')
    .notNull()
    .references(() => companies.id),
  finalTotal: numeric('final_total').notNull(),
  paymentTerms: paymentTermsEnum('payment_terms'),
  leadTimeDays: integer('lead_time_days'),
  status: dealStatusEnum('status').notNull().default('confirmed'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── notifications (durable in-app inbox) ──────────────────────────────────────
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    payload: jsonb('payload').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byUser: index('notifications_user_idx').on(t.userId),
  }),
);

// ── audit_log (APPEND-ONLY — the product's spine) ─────────────────────────────
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id'), // nullable: system/cron actions
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    snapshotJson: jsonb('snapshot_json'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byEntity: index('audit_entity_idx').on(t.entityType, t.entityId),
    byActor: index('audit_actor_idx').on(t.actorUserId),
  }),
);

// ── disputes ──────────────────────────────────────────────────────────────────
export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id),
  raisedByUserId: uuid('raised_by_user_id')
    .notNull()
    .references(() => users.id),
  reason: text('reason').notNull(),
  evidenceUrl: text('evidence_url'),
  status: disputeStatusEnum('status').notNull().default('open'),
  resolutionNote: text('resolution_note'),
  resolvedByOperatorId: uuid('resolved_by_operator_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── reports (bad-actor reports → operator moderation queue) ────────────────────
export const reports = pgTable('reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  reporterCompanyId: uuid('reporter_company_id')
    .notNull()
    .references(() => companies.id),
  reportedCompanyId: uuid('reported_company_id')
    .notNull()
    .references(() => companies.id),
  reason: text('reason').notNull(),
  status: disputeStatusEnum('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Service Providers Hub (open identity — NO blind mechanics here) ───────────
// A company opts in as a transporter and/or packing supplier; "Needers"
// (buyers or sellers) post open-identity inquiries; matching providers quote.

export const serviceProviderProfiles = pgTable('service_provider_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .unique()
    .references(() => companies.id),
  contactUserId: uuid('contact_user_id')
    .notNull()
    .references(() => users.id),
  isTransporter: boolean('is_transporter').notNull().default(false),
  vehicleTypes: text('vehicle_types').array().notNull().default([]),
  isPackingSupplier: boolean('is_packing_supplier').notNull().default(false),
  packingTypes: text('packing_types').array().notNull().default([]),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const serviceRequests = pgTable(
  'service_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: serviceKindEnum('kind').notNull(),
    neederCompanyId: uuid('needer_company_id')
      .notNull()
      .references(() => companies.id),
    neederUserId: uuid('needer_user_id')
      .notNull()
      .references(() => users.id),
    status: serviceRequestStatusEnum('status').notNull().default('open'),
    // Baseline payment terms — a primary negotiation parameter (providers may counter in text).
    paymentTerms: paymentTermsEnum('payment_terms').notNull(),
    description: text('description'),
    // — transport fields —
    materialName: text('material_name'),
    totalQtyKg: numeric('total_qty_kg'), // gross: chemical + packaging weight
    lotQtyKg: numeric('lot_qty_kg'), // max per truck/tanker, gross
    vehicleTypes: text('vehicle_types').array().notNull().default([]),
    pickupAddress: text('pickup_address'),
    dropAddress: text('drop_address'),
    // Google Places anchors (spec §3): set when the address was picked from the
    // Places autocomplete — guarantees routable, real locations.
    pickupPlaceId: text('pickup_place_id'),
    dropPlaceId: text('drop_place_id'),
    // — packing fields —
    packingType: text('packing_type'),
    condition: packingConditionEnum('condition'),
    quantityPieces: integer('quantity_pieces'),
    materialSpec: text('material_spec'),
    weightPerPiece: text('weight_per_piece'),
    logisticsBasis: logisticsBasisEnum('logistics_basis'),
    acceptedQuoteId: uuid('accepted_quote_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byNeeder: index('service_requests_needer_idx').on(t.neederCompanyId),
    byStatusKind: index('service_requests_status_kind_idx').on(t.status, t.kind),
  }),
);

export const serviceQuotes = pgTable(
  'service_quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: uuid('request_id')
      .notNull()
      .references(() => serviceRequests.id),
    providerCompanyId: uuid('provider_company_id')
      .notNull()
      .references(() => companies.id),
    providerUserId: uuid('provider_user_id')
      .notNull()
      .references(() => users.id),
    // Transport: ₹/kg. Packing: ₹/piece.
    baseRate: numeric('base_rate').notNull(),
    // Absolute tax in ₹ for the whole job (per spec), not per unit.
    taxAmount: numeric('tax_amount').notNull().default('0'),
    // Total Cost = base_rate × quantity + tax. Stored for audit/history.
    total: numeric('total').notNull(),
    // Null = accepts the needer's baseline payment terms.
    altPaymentTerms: text('alt_payment_terms'),
    note: text('note'),
    status: serviceQuoteStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    // One quote per provider per request (they can revise it).
    uniqProviderRequest: unique('uniq_provider_request').on(t.requestId, t.providerCompanyId),
    byRequest: index('service_quotes_request_idx').on(t.requestId),
    byProvider: index('service_quotes_provider_idx').on(t.providerCompanyId),
  }),
);

// ── otp_codes (contact verification — email + phone OTP) ──────────────────────
// Service-role only (RLS default-deny): a logged-in user must NEVER read its own
// code_hash via PostgREST. Codes are HMAC-hashed (server pepper), single-use,
// short-TTL, attempt-capped. Rate limits are enforced by querying created_at
// windows here (the in-memory limiter can't gate cost across Vercel lambdas).
export const otpCodes = pgTable(
  'otp_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    channel: otpChannelEnum('channel').notNull(),
    destination: text('destination').notNull(), // email address, or +91 E.164 phone
    codeHash: text('code_hash').notNull(), // HMAC-SHA256(code, OTP_HMAC_SECRET)
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    byUserChannelCreated: index('otp_user_channel_created_idx').on(
      t.userId,
      t.channel,
      t.createdAt,
    ),
    byDestinationCreated: index('otp_destination_created_idx').on(t.destination, t.createdAt),
  }),
);

// ── Inferred types ────────────────────────────────────────────────────────────
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Operator = typeof operators.$inferSelect;
export type CatalogItem = typeof catalogItems.$inferSelect;
export type NewCatalogItem = typeof catalogItems.$inferInsert;
export type CasCacheRow = typeof casCache.$inferSelect;
export type Auction = typeof auctions.$inferSelect;
export type NewAuction = typeof auctions.$inferInsert;
export type RegisteredPartner = typeof registeredPartners.$inferSelect;
export type Bid = typeof bids.$inferSelect;
export type NewBid = typeof bids.$inferInsert;
export type ProactiveShare = typeof proactiveShares.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type Dispute = typeof disputes.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ServiceProviderProfile = typeof serviceProviderProfiles.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type NewServiceRequest = typeof serviceRequests.$inferInsert;
export type ServiceQuote = typeof serviceQuotes.$inferSelect;
export type OtpCode = typeof otpCodes.$inferSelect;
export type NewOtpCode = typeof otpCodes.$inferInsert;
