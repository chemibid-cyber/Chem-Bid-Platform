/**
 * QA helper — push an auction past its deadline so the close cron will settle it,
 * or (with `--direct`) move it straight to awaiting_decision. Live-DB only, for testing.
 *
 *   npx tsx scripts/qa-force-close.ts <auctionId>            # set closes_at to the past
 *   npx tsx scripts/qa-force-close.ts <auctionId> --direct   # also flip to awaiting_decision
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const id = process.argv[2];
  const direct = process.argv.includes('--direct');
  if (!id) {
    console.error('usage: tsx scripts/qa-force-close.ts <auctionId> [--direct]');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const before = await sql`select id, name, status, stage, closes_at from auctions where id = ${id}`;
  console.log('BEFORE:', before[0] ?? 'NOT FOUND');

  await sql`update auctions set closes_at = now() - interval '2 hours' where id = ${id}`;

  if (direct) {
    await sql`update auctions set status = 'awaiting_decision', awaiting_since = now() where id = ${id} and status = 'active'`;
  }

  const after = await sql`select id, name, status, stage, closes_at, awaiting_since from auctions where id = ${id}`;
  console.log('AFTER:', after[0]);

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
