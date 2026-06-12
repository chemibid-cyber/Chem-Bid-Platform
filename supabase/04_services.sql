-- ─────────────────────────────────────────────────────────────────────────────
-- Service Providers Hub — RLS (open-identity module).
--
-- Same trust model as 02_policies.sql: the Next.js server writes via the
-- trusted DATABASE_URL connection; these policies harden the anon/PostgREST
-- surface. SELECT-only; no INSERT/UPDATE/DELETE granted to tenants.
--
-- Open-identity rules:
--   • provider profiles + service requests are an open marketplace →
--     readable by any signed-in tenant (that's the module's design);
--   • quotes are commercial: readable ONLY by the quoting provider and the
--     request's needer (competing providers never see each other's quotes).
-- Run AFTER 02_policies.sql (uses its helper functions). Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table service_provider_profiles enable row level security;
alter table service_requests          enable row level security;
alter table service_quotes            enable row level security;

drop policy if exists service_profiles_select on service_provider_profiles;
create policy service_profiles_select on service_provider_profiles
  for select to authenticated using (true);

drop policy if exists service_requests_select on service_requests;
create policy service_requests_select on service_requests
  for select to authenticated using (true);

drop policy if exists service_quotes_select on service_quotes;
create policy service_quotes_select on service_quotes
  for select to authenticated using (
    provider_company_id = app_company_id()
    or app_is_operator()
    or exists (
      select 1 from service_requests r
      where r.id = service_quotes.request_id
        and r.needer_company_id = app_company_id()
    )
  );
