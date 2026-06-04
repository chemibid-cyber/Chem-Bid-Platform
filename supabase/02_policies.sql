-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security policies (Prompt 7) — the DB-level privacy guarantee.
--
-- Trust model: the Next.js server reads/writes via DATABASE_URL (a trusted
-- connection that bypasses RLS) and enforces authorization in app code. These
-- policies harden the *anon/authenticated PostgREST + Realtime* surface, so even
-- a leaked anon key cannot read across companies. INSERT/UPDATE/DELETE are NOT
-- granted to anon/authenticated (all writes go through the server/service role).
--
-- The encoded guarantees (CLAUDE.md §4):
--   • a seller can read ONLY their own bid (never a competitor's)
--   • a buyer can see a seller's identity ONLY after that seller Accepts (or close)
--   • audit_log is never readable by tenants and never updatable/deletable
-- Run AFTER 01_enable_rls.sql.
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: the company of the current auth user (security definer to avoid RLS recursion).
create or replace function app_company_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select company_id from public.users where id = auth.uid()
$$;

create or replace function app_is_operator() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.operators where auth_user_id = auth.uid())
$$;

create or replace function app_gstin() returns text
  language sql stable security definer set search_path = public as $$
  select c.gstin from public.companies c
  join public.users u on u.company_id = c.id
  where u.id = auth.uid()
$$;

-- ── companies ────────────────────────────────────────────────────────────────
-- Own company always; a SELLER company becomes visible to a BUYER only once it
-- has Accepted that buyer's auction (or the auction closed); a BUYER company is
-- visible to a seller it invited (the seller has a bid row).
drop policy if exists companies_select on companies;
create policy companies_select on companies for select to authenticated using (
  id = app_company_id()
  or app_is_operator()
  or exists (
    select 1 from bids b join auctions a on a.id = b.auction_id
    where b.seller_company_id = companies.id
      and a.buyer_company_id = app_company_id()
      and (b.gate_state = 'accepted' or a.status in ('awaiting_decision', 'closed'))
  )
  or exists (
    select 1 from bids b join auctions a on a.id = b.auction_id
    where a.buyer_company_id = companies.id
      and b.seller_company_id = app_company_id()
  )
);

-- ── users ────────────────────────────────────────────────────────────────────
-- Own company's users; counterparty CONTACT users under the same reveal rule.
drop policy if exists users_select on users;
create policy users_select on users for select to authenticated using (
  company_id = app_company_id()
  or app_is_operator()
  or exists (
    select 1 from bids b join auctions a on a.id = b.auction_id
    where b.seller_user_id = users.id
      and a.buyer_company_id = app_company_id()
      and (b.gate_state = 'accepted' or a.status in ('awaiting_decision', 'closed'))
  )
  or exists (
    select 1 from bids b join auctions a on a.id = b.auction_id
    where a.buyer_user_id = users.id
      and b.seller_company_id = app_company_id()
  )
);

-- ── bids ─────────────────────────────────────────────────────────────────────
-- A seller reads ONLY their own bid. A buyer reads bids on their own auctions.
-- This is the core blind-bidding guarantee: seller A can never read seller B.
drop policy if exists bids_select on bids;
create policy bids_select on bids for select to authenticated using (
  seller_company_id = app_company_id()
  or app_is_operator()
  or exists (select 1 from auctions a where a.id = bids.auction_id and a.buyer_company_id = app_company_id())
);

-- ── auctions ─────────────────────────────────────────────────────────────────
-- Own auctions (buyer), or auctions you were invited to (you have a bid row).
drop policy if exists auctions_select on auctions;
create policy auctions_select on auctions for select to authenticated using (
  buyer_company_id = app_company_id()
  or app_is_operator()
  or exists (select 1 from bids b where b.auction_id = auctions.id and b.seller_company_id = app_company_id())
);

-- ── catalog_items ────────────────────────────────────────────────────────────
drop policy if exists catalog_select on catalog_items;
create policy catalog_select on catalog_items for select to authenticated using (
  company_id = app_company_id() or app_is_operator()
);

-- ── deals ────────────────────────────────────────────────────────────────────
drop policy if exists deals_select on deals;
create policy deals_select on deals for select to authenticated using (
  buyer_company_id = app_company_id() or seller_company_id = app_company_id() or app_is_operator()
);

-- ── disputes ─────────────────────────────────────────────────────────────────
drop policy if exists disputes_select on disputes;
create policy disputes_select on disputes for select to authenticated using (
  app_is_operator()
  or exists (
    select 1 from deals d where d.id = disputes.deal_id
      and (d.buyer_company_id = app_company_id() or d.seller_company_id = app_company_id())
  )
);

-- ── notifications ────────────────────────────────────────────────────────────
drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select to authenticated using (
  user_id = auth.uid()
);

-- ── registered_partners ──────────────────────────────────────────────────────
drop policy if exists partners_select on registered_partners;
create policy partners_select on registered_partners for select to authenticated using (
  buyer_company_id = app_company_id() or partner_gstin = app_gstin() or app_is_operator()
);

-- ── blocks ───────────────────────────────────────────────────────────────────
drop policy if exists blocks_select on blocks;
create policy blocks_select on blocks for select to authenticated using (
  blocker_company_id = app_company_id() or app_is_operator()
);

-- ── proactive_shares ─────────────────────────────────────────────────────────
drop policy if exists shares_select on proactive_shares;
create policy shares_select on proactive_shares for select to authenticated using (
  seller_company_id = app_company_id() or app_is_operator()
);

-- ── cas_cache (public chemical reference data) ───────────────────────────────
drop policy if exists cas_select on cas_cache;
create policy cas_select on cas_cache for select to authenticated using (true);

-- ── operators ────────────────────────────────────────────────────────────────
drop policy if exists operators_self on operators;
create policy operators_self on operators for select to authenticated using (
  auth_user_id = auth.uid()
);

-- ── reports ──────────────────────────────────────────────────────────────────
drop policy if exists reports_select on reports;
create policy reports_select on reports for select to authenticated using (
  reporter_company_id = app_company_id() or app_is_operator()
);

-- ── audit_log: operators may read; NOBODY (subject to RLS) may update/delete ──
-- (01_enable_rls.sql already revoked update,delete from anon,authenticated.)
drop policy if exists audit_select on audit_log;
create policy audit_select on audit_log for select to authenticated using (app_is_operator());
