/** One-off: confirm the 2026-06-12 migration landed on the live DB. */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const cols = await sql`
  select table_name, column_name from information_schema.columns
  where (table_name = 'bids' and column_name = 'stage1_tax')
     or table_name in ('service_provider_profiles','service_requests','service_quotes')
  order by table_name, ordinal_position`;
const tables = [...new Set(cols.map((c) => c.table_name))];
console.log('tables present:', tables.join(', '));
console.log('bids.stage1_tax:', cols.some((c) => c.table_name === 'bids') ? 'YES' : 'MISSING');
const rls = await sql`
  select tablename, rowsecurity from pg_tables
  where tablename in ('service_provider_profiles','service_requests','service_quotes')`;
console.log('RLS:', rls.map((r) => `${r.tablename}=${r.rowsecurity}`).join(' '));
await sql.end();
