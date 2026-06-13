/**
 * Append-only audit trail (CLAUDE.md §2.6 / §4). THE PRODUCT'S SPINE.
 *
 * Every mutation in the app calls recordAudit() (or recordAuditTx() inside a
 * Drizzle transaction so the write + its audit row commit atomically).
 * Nothing here ever updates or deletes — the audit_log RLS policy (Prompt 7)
 * also rejects UPDATE/DELETE at the database level.
 */
import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';

/** Stable action vocabulary so the trail is queryable/consistent. */
export const AuditAction = {
  CompanyCreated: 'company.created',
  CompanyVerified: 'company.verified',
  CompanyRejected: 'company.rejected',
  CompanySuspended: 'company.suspended',
  CompanyUnsuspended: 'company.unsuspended',
  CompanyGstRefreshed: 'company.gst_refreshed',
  CompletionScoreChanged: 'company.completion_score_changed',
  UserCreated: 'user.created',
  UserInvited: 'user.invited',
  UserDisabled: 'user.disabled',
  UserReassigned: 'user.reassigned',
  UserDeletionRequested: 'user.deletion_requested',
  OtpSent: 'user.otp_sent',
  EmailVerified: 'user.email_verified',
  PhoneVerified: 'user.phone_verified',
  CatalogItemCreated: 'catalog_item.created',
  CatalogItemUpdated: 'catalog_item.updated',
  CatalogItemDelisted: 'catalog_item.delisted',
  CatalogTransferRequested: 'catalog_item.transfer_requested',
  AuctionCreated: 'auction.created',
  AuctionPublished: 'auction.published',
  AuctionExtended: 'auction.extended',
  AuctionCancelled: 'auction.cancelled',
  AuctionClosed: 'auction.closed',
  AuctionUnsuccessful: 'auction.unsuccessful',
  AuctionCloned: 'auction.cloned',
  AuctionRetroMatched: 'auction.retro_matched',
  PartnerRegistered: 'partner.registered',
  PartnerDeclined: 'partner.declined',
  BidSubmitted: 'bid.submitted',
  BidRevised: 'bid.revised',
  BidWithdrawn: 'bid.withdrawn',
  SellerAccepted: 'bid.gate_accepted',
  SellerIgnored: 'bid.gate_ignored',
  SellerUnignored: 'bid.gate_unignored',
  Stage2Launched: 'auction.stage2_launched',
  Stage2Response: 'bid.stage2_response',
  Stage2Expired: 'bid.stage2_expired',
  DealConfirmed: 'deal.confirmed',
  DealDisputed: 'deal.disputed',
  DisputeResolved: 'dispute.resolved',
  Blocked: 'block.created',
  Reported: 'report.created',
  ServiceProfileUpserted: 'service_profile.upserted',
  ServiceRequestCreated: 'service_request.created',
  ServiceRequestCancelled: 'service_request.cancelled',
  ServiceQuoteSubmitted: 'service_quote.submitted',
  ServiceQuoteWithdrawn: 'service_quote.withdrawn',
  ServiceQuoteAccepted: 'service_quote.accepted',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  actorUserId?: string | null; // null = system/cron action
  entityType: string;
  entityId: string;
  action: AuditActionType | string;
  snapshot?: unknown;
}

function toValues(entry: AuditEntry) {
  return {
    actorUserId: entry.actorUserId ?? null,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    snapshotJson: (entry.snapshot ?? null) as object | null,
  };
}

/** Standalone append. Use right after a mutation when a transaction isn't needed. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values(toValues(entry));
}

/** Transaction-bound append — pass the Drizzle tx so mutation + audit are atomic. */
export async function recordAuditTx(
  tx: { insert: typeof db.insert },
  entry: AuditEntry,
): Promise<void> {
  await tx.insert(auditLog).values(toValues(entry));
}
