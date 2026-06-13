-- ─────────────────────────────────────────────────────────────────────────────
-- otp_codes — contact-verification one-time codes. SERVICE-ROLE ONLY.
--
-- Unlike every other table, this one has NO SELECT policy on purpose: a signed-in
-- user must NEVER be able to read code_hash (its own or anyone's) over the
-- anon/PostgREST surface — that would defeat the whole point of hashing the OTP.
--
-- RLS is enabled with zero tenant policies → default-deny for anon + authenticated.
-- The trusted Next.js server path (Drizzle over DATABASE_URL) and the Supabase
-- service role bypass RLS and own all reads/writes for this table.
--
-- Run AFTER 02_policies.sql. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

alter table otp_codes enable row level security;

-- Belt-and-suspenders: strip table privileges from the API roles so even a
-- mistakenly-added policy can't expose code_hash.
revoke all on table otp_codes from anon, authenticated;
