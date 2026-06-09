/** QA helper — print an auction's status + any deal/bids for it. Live-DB read-only. */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const id = process.argv[2];
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const auction = await sql`select id, name, status, stage from auctions where id = ${id}`;
  console.log('AUCTION:', auction[0] ?? 'NOT FOUND');

  const bids = await sql`select seller_company_id, status, gate_state, stage1_total, stage2_rate from bids where auction_id = ${id} and stage1_total is not null`;
  console.log('BIDS:', bids);

  const deals = await sql`select id, bid_id, status, final_total, created_at from deals where auction_id = ${id}`;
  console.log('DEALS:', deals);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
