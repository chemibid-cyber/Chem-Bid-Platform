import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    const rows = await sql`
      select u.id, u.email, u.status, u.can_buy, u.can_sell, c.legal_name
      from users u join companies c on c.id = u.company_id
      where u.email = 'vrajtalatii@gmail.com'`;
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
