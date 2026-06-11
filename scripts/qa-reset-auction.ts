/** QA helper — reset a confirmed auction back to awaiting_decision so the
 *  Confirm-deal flow can be re-tested. Live-DB only, for testing. */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('usage: tsx scripts/qa-reset-auction.ts <auctionId>');
    process.exit(1);
  }
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  await sql`delete from deals where auction_id = ${id}`;
  await sql`update bids set status = 'active' where auction_id = ${id} and status in ('won', 'lost')`;
  await sql`update auctions set status = 'awaiting_decision', stage = 'stage1', awaiting_since = now() where id = ${id}`;

  const a = await sql`select id, name, status, stage from auctions where id = ${id}`;
  const b = await sql`select status, stage1_total from bids where auction_id = ${id} and stage1_total is not null`;
  const d = await sql`select count(*)::int as n from deals where auction_id = ${id}`;
  console.log('AUCTION:', a[0]);
  console.log('BIDS:', b);
  console.log('DEALS:', d[0]);

  await sql.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
