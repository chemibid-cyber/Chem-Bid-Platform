/**
 * Seeds demo company accounts (a buyer + a seller) so you can log in and try the
 * full marketplace without signing up by hand. Idempotent per GSTIN.
 * Run: npx tsx scripts/seed-demo.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { companies, users, catalogItems } from '../src/lib/db/schema';

interface DemoCompany {
  gstin: string;
  legalName: string;
  address: string;
  email: string;
  password: string;
  first: string;
  last: string;
  sellsToluene?: boolean;
}

const DEMOS: DemoCompany[] = [
  {
    gstin: '27AABCB1234A1Z5',
    legalName: 'Demo Buyer Chemicals Pvt Ltd',
    address: 'Plot 12, MIDC Industrial Estate, Mumbai, Maharashtra - 400001',
    email: 'buyer@demo.test',
    password: 'Demo@1234',
    first: 'Bhavna',
    last: 'Buyer',
  },
  {
    gstin: '24AABCS5678B1Z3',
    legalName: 'Demo Seller Organics Pvt Ltd',
    address: 'Plot 8, GIDC Estate, Ahmedabad, Gujarat - 380001',
    email: 'seller@demo.test',
    password: 'Demo@1234',
    first: 'Suresh',
    last: 'Seller',
    sellsToluene: true,
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;
  if (!url || !serviceKey || !dbUrl) throw new Error('Missing Supabase/DATABASE_URL env in .env.local');

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const sql = postgres(dbUrl, { max: 1 });
  const db = drizzle(sql);

  for (const d of DEMOS) {
    const [existing] = await db.select().from(companies).where(eq(companies.gstin, d.gstin)).limit(1);
    if (existing) {
      console.log(`• ${d.legalName} already seeded — login: ${d.email} / ${d.password}`);
      continue;
    }

    const { data: created, error } = await supabase.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { first_name: d.first, last_name: d.last },
    });
    if (error || !created.user) {
      console.error(`✗ ${d.email}: ${error?.message ?? 'createUser failed'} (delete the user in Supabase Auth and retry)`);
      continue;
    }
    const authId = created.user.id;
    const pan = d.gstin.slice(2, 12);

    const [company] = await db
      .insert(companies)
      .values({
        gstin: d.gstin,
        pan,
        legalName: d.legalName,
        registeredAddress: d.address,
        verificationStatus: 'verified',
        gstLastRefreshedAt: new Date(),
      })
      .returning();
    if (!company) throw new Error('company insert failed');

    await db.insert(users).values({
      id: authId,
      companyId: company.id,
      firstName: d.first,
      lastName: d.last,
      email: d.email,
      phone: '9900000000',
      designation: 'Commercial Head',
      team: 'Solvents',
      canBuy: true,
      canSell: true,
      isAdmin: true,
      status: 'active',
      tncAcceptedAt: new Date(),
      dpdpConsentAt: new Date(),
    });

    if (d.sellsToluene) {
      await db.insert(catalogItems).values({
        companyId: company.id,
        ownerUserId: authId,
        profileType: 'sales',
        casNumber: '108-88-3',
        name: 'Toluene',
        nameVerified: true,
        isMixture: false,
        roles: ['mfr', 'trader'],
        grade: 'trade',
        minPurity: '99',
      });
    }

    console.log(`✓ ${d.legalName} — login: ${d.email} / ${d.password}${d.sellsToluene ? '  (+ Toluene in sales catalog)' : ''}`);
  }

  await sql.end();
  console.log('\nBoth are verified (can post/bid immediately). Sign in at /login.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
