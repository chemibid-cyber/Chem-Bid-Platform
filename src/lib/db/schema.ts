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
  phone: text('phone'),
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
    stage2Target: numeric('stage2_target'),
    stage2ClosesAt: timestamp('stage2_closes_at', { withTimezone: true }),
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
    stage1Basic: numeric('stage1_basic'),
    stage1Freight: numeric('stage1_freight'),
    stage1Total: numeric('stage1_total'),
    paymentTerms: paymentTermsEnum('payment_terms'),
    leadTimeDays: integer('lead_time_days'),
    coaFileUrl: text('coa_file_url'),
    coaOnDispatch: boolean('coa_on_dispatch').notNull().default(false),
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
