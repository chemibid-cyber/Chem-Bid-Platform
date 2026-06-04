-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Row-Level Security on every table.
--
-- Run this AFTER the Drizzle migration (npm run db:migrate) has created the tables.
-- With RLS enabled and NO policies, the anon/authenticated PostgREST surface is
-- default-deny. The Next.js server talks to Postgres via DATABASE_URL (a trusted
-- connection) and enforces authorization in app code; RLS hardens the anon key.
--
-- The blind-bidding read policies are added in Prompt 7 (02_policies.sql).
-- audit_log stays insert-only there. For now: lock everything down.
-- ─────────────────────────────────────────────────────────────────────────────

alter table companies            enable row level security;
alter table users                enable row level security;
alter table operators            enable row level security;
alter table catalog_items        enable row level security;
alter table cas_cache            enable row level security;
alter table auctions             enable row level security;
alter table registered_partners  enable row level security;
alter table bids                 enable row level security;
alter table proactive_shares     enable row level security;
alter table blocks               enable row level security;
alter table deals                enable row level security;
alter table notifications        enable row level security;
alter table audit_log            enable row level security;
alter table disputes             enable row level security;
alter table reports              enable row level security;

-- Defence-in-depth: forbid UPDATE/DELETE on the audit trail for ALL roles that
-- are subject to RLS (the service_role bypasses RLS and is server-only). This
-- makes the append-only guarantee structural, not just conventional.
revoke update, delete on audit_log from anon, authenticated;
