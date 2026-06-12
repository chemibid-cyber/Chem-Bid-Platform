/**
 * Multi-user marketplace simulation against the LIVE DB, using the REAL app
 * engines (runTargeting, computeTotalRate, rankOf, stage2Total, …). Emulates
 * only the HTTP/form wrapper around them.
 *
 * Scenario (the product owner's test ask, 2026-06-12):
 *   10 sellers — 5 carry Acetone (67-64-1), 5 carry other chemicals — plus an
 *   11th who carries Acetone but is BLOCKED by the buyer. The buyer posts an
 *   Acetone auction: exactly the 5 unblocked Acetone sellers must be notified.
 *   The 5 bid in different shapes (incl. a deliberate price tie). Blind ranks,
 *   tie-break, withdraw, revise, close-by-cron, and a Stage-2 material-rate
 *   round (accept / final / reject / silent) are all asserted.
 *
 *   npx tsx scripts/sim-multiuser.ts            # phase 1: setup → bids → ranks
 *   npx tsx scripts/sim-multiuser.ts --phase2   # close + Stage-2 + effective order
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { and, eq, isNotNull, inArray } from 'drizzle-orm';
import { db } from '../src/lib/db';
import {
  companies,
  users,
  catalogItems,
  auctions,
  bids,
  blocks,
  notifications,
} from '../src/lib/db/schema';
import { runTargeting } from '../src/lib/targeting/run';
import { computeTotalRate, stage2Total, isValidStage2Rate } from '../src/lib/pricing';
import { rankOf, effectiveTotal } from '../src/lib/ranking';

const CAS_ACETONE = '67-64-1';
const STATE_FILE = 'scripts/.sim-state.json';
const BUYER_GSTIN = '27AABCB1234A1Z5'; // existing Demo Buyer (browser-checkable)

interface SimSeller {
  key: string;
  cas: string;
  name: string;
  roles: string[];
  blocked?: boolean;
}

const SELLERS: SimSeller[] = [
  { key: 'S01', cas: CAS_ACETONE, name: 'Acetone', roles: ['mfr'] },
  { key: 'S02', cas: CAS_ACETONE, name: 'Acetone', roles: ['dist'] },
  { key: 'S03', cas: CAS_ACETONE, name: 'Acetone', roles: ['trader'] },
  { key: 'S04', cas: CAS_ACETONE, name: 'Acetone', roles: ['mfr'] },
  { key: 'S05', cas: CAS_ACETONE, name: 'Acetone', roles: ['dist'] },
  { key: 'S06', cas: '64-17-5', name: 'Ethanol', roles: ['mfr'] },
  { key: 'S07', cas: '71-43-2', name: 'Benzene', roles: ['mfr'] },
  { key: 'S08', cas: '1330-20-7', name: 'Xylene', roles: ['dist'] },
  { key: 'S09', cas: '67-63-0', name: 'Isopropyl alcohol', roles: ['trader'] },
  { key: 'S10', cas: '78-93-3', name: 'Methyl ethyl ketone', roles: ['mfr'] },
  // Negative case: carries Acetone but the buyer blocked them for this CAS.
  { key: 'S11', cas: CAS_ACETONE, name: 'Acetone', roles: ['mfr'], blocked: true },
];

type SellerKey = string;

interface SimState {
  auctionId: string;
  buyerUserId: string;
  sellers: Record<string, { companyId: string; userId: string; email: string }>;
}

const results: { name: string; pass: boolean; detail: string }[] = [];
function check(name: string, pass: boolean, detail: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${name} — ${detail}`);
}

function gstinFor(i: number): string {
  return `24SIMQA${String(i).padStart(4, '0')}Q1Z${i % 10}`;
}

async function ensureSeller(i: number, supabase: SupabaseClient) {
  const s = SELLERS[i - 1];
  const gstin = gstinFor(i);
  const email = `s${String(i).padStart(2, '0')}@sim.test`;

  let [company] = await db.select().from(companies).where(eq(companies.gstin, gstin)).limit(1);
  if (!company) {
    let authId: string | undefined;
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      password: 'Sim@12345',
      email_confirm: true,
      user_metadata: { first_name: 'Sim', last_name: `Seller ${s.key}` },
    });
    if (error) {
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      authId = list?.users.find((u) => u.email === email)?.id;
      if (!authId) throw new Error(`auth user for ${email}: ${error.message}`);
    } else {
      authId = created.user!.id;
    }

    [company] = await db
      .insert(companies)
      .values({
        gstin,
        pan: gstin.slice(2, 12),
        legalName: `Sim Chem ${s.key} Pvt Ltd`,
        registeredAddress: `Plot ${i}, Sim Industrial Estate, Vapi, Gujarat - 3961${String(i).padStart(2, '0')}`,
        verificationStatus: 'verified',
        gstLastRefreshedAt: new Date(),
      })
      .returning();

    await db
      .insert(users)
      .values({
        id: authId!,
        companyId: company!.id,
        firstName: 'Sim',
        lastName: `Seller ${s.key}`,
        email,
        phone: `98000000${String(i).padStart(2, '0')}`,
        designation: 'Sales Head',
        team: 'Solvents',
        canBuy: false,
        canSell: true,
        isAdmin: true,
        status: 'active',
        tncAcceptedAt: new Date(),
        dpdpConsentAt: new Date(),
      })
      .onConflictDoNothing();
  }

  const [user] = await db.select().from(users).where(eq(users.companyId, company!.id)).limit(1);
  if (!user) throw new Error(`no app user for ${email}`);

  const [item] = await db
    .select({ id: catalogItems.id })
    .from(catalogItems)
    .where(
      and(
        eq(catalogItems.companyId, company!.id),
        eq(catalogItems.casNumber, s.cas),
        eq(catalogItems.profileType, 'sales'),
      ),
    )
    .limit(1);
  if (!item) {
    await db.insert(catalogItems).values({
      companyId: company!.id,
      ownerUserId: user.id,
      profileType: 'sales',
      casNumber: s.cas,
      name: s.name,
      nameVerified: true,
      isMixture: false,
      roles: [...s.roles],
      grade: 'trade',
      minPurity: '99',
    });
  }

  return { key: s.key, companyId: company!.id, userId: user.id, email };
}

/** Mirror of submitBidAction's write (the action itself is auth-bound). */
async function quote(
  state: SimState,
  key: SellerKey,
  basic: number,
  freight: number,
  tax: number,
  at: Date,
) {
  const seller = state.sellers[key];
  const total = computeTotalRate({ basic, freight, tax, basis: 'delivered' });
  await db
    .update(bids)
    .set({
      gateState: 'accepted',
      sellerUserId: seller.userId,
      stage1Basic: String(basic),
      stage1Freight: String(freight),
      stage1Tax: String(tax),
      stage1Total: String(total),
      paymentTerms: 'net30',
      leadTimeDays: 7,
      coaOnDispatch: true,
      status: 'active',
      createdAt: at, // first-quote stamp (parity with the fixed submitBidAction)
      updatedAt: at,
    })
    .where(and(eq(bids.auctionId, state.auctionId), eq(bids.sellerCompanyId, seller.companyId)));
  return total;
}

/** Same query + rankOf as getMyRankAction. */
async function blindRanks(auctionId: string) {
  const active = await db
    .select({
      id: bids.id,
      companyId: bids.sellerCompanyId,
      total: bids.stage1Total,
      createdAt: bids.createdAt,
    })
    .from(bids)
    .where(and(eq(bids.auctionId, auctionId), eq(bids.status, 'active'), isNotNull(bids.stage1Total)));
  const rankable = active.map((b) => ({ id: b.id, total: Number(b.total), createdAt: b.createdAt }));
  const byCompany = new Map(active.map((b) => [b.companyId, rankOf(rankable, b.id)]));
  return { count: active.length, byCompany };
}

async function phase1() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log('— Phase 1: setup → targeting → bids → ranks —\n');

  const [buyerCompany] = await db.select().from(companies).where(eq(companies.gstin, BUYER_GSTIN)).limit(1);
  if (!buyerCompany) throw new Error('Demo buyer not seeded');
  const [buyerUser] = await db.select().from(users).where(eq(users.companyId, buyerCompany.id)).limit(1);
  if (!buyerUser) throw new Error('Demo buyer user missing');

  const sellers: SimState['sellers'] = {};
  for (let i = 1; i <= SELLERS.length; i++) {
    const s = await ensureSeller(i, supabase);
    sellers[s.key] = { companyId: s.companyId, userId: s.userId, email: s.email };
    console.log(`  ready ${s.key} (${SELLERS[i - 1].name})${SELLERS[i - 1].blocked ? ' [to be blocked]' : ''}`);
  }

  // The buyer blocks S11 for Acetone (negative case).
  const [existingBlock] = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      and(
        eq(blocks.blockerCompanyId, buyerCompany.id),
        eq(blocks.blockedCompanyId, sellers.S11.companyId),
        eq(blocks.casNumber, CAS_ACETONE),
      ),
    )
    .limit(1);
  if (!existingBlock) {
    await db.insert(blocks).values({
      blockerCompanyId: buyerCompany.id,
      blockedCompanyId: sellers.S11.companyId,
      casNumber: CAS_ACETONE,
      scope: 'this_cas',
    });
  }

  // Buyer posts the Acetone auction (mirror of createAuctionAction's insert).
  const [auction] = await db
    .insert(auctions)
    .values({
      buyerCompanyId: buyerCompany.id,
      buyerUserId: buyerUser.id,
      casNumber: CAS_ACETONE,
      name: 'Acetone',
      quantity: '3000',
      unit: 'kg',
      minPurity: '99',
      packing: '200 L drums',
      deliveryAddress: buyerCompany.registeredAddress,
      logisticsBasis: 'delivered',
      supplierFilter: [],
      privacyMode: 'all',
      blind: true,
      status: 'active',
      stage: 'stage1',
      closesAt: new Date(Date.now() + 2 * 24 * 3600_000),
    })
    .returning();
  if (!auction) throw new Error('auction insert failed');
  console.log(`\n  auction ${auction.id} (Acetone, 3000 kg) posted by ${buyerCompany.legalName}\n`);

  // ── REAL targeting engine ──
  const { notified } = await runTargeting(auction);
  check('A1 targeting count', notified === 5, `notified=${notified} (expected 5 of 11 sellers)`);

  const targetRows = await db
    .select({ companyId: bids.sellerCompanyId })
    .from(bids)
    .where(eq(bids.auctionId, auction.id));
  const targeted = new Set(targetRows.map((r) => r.companyId));
  const expected = ['S01', 'S02', 'S03', 'S04', 'S05'];
  const allExpected = expected.every((k) => targeted.has(sellers[k].companyId));
  check('A2 right sellers targeted', allExpected && targeted.size === 5, `bid rows: ${targeted.size}; S01–S05 present=${allExpected}`);
  check(
    'A3 blocked seller excluded',
    !targeted.has(sellers.S11.companyId),
    'S11 carries Acetone but buyer blocked them — no request row',
  );
  const wrongChem = ['S06', 'S07', 'S08', 'S09', 'S10'].filter((k) => targeted.has(sellers[k].companyId));
  check('A4 non-matching sellers excluded', wrongChem.length === 0, `other-chemical sellers targeted: ${wrongChem.length}`);

  const notifRows = await db
    .select({ userId: notifications.userId, payload: notifications.payload })
    .from(notifications)
    .where(
      inArray(
        notifications.userId,
        expected.map((k) => sellers[k].userId),
      ),
    );
  const notifCount = notifRows.filter(
    (n) => (n.payload as { auctionId?: string }).auctionId === auction.id,
  ).length;
  check('A5 in-app notifications', notifCount === 5, `${notifCount}/5 sellers have the in-app notification`);

  // ── Five bids, five shapes (incl. a deliberate 90.00 tie: S04 earlier than S05) ──
  const t = Date.now();
  await quote({ auctionId: auction.id, buyerUserId: buyerUser.id, sellers }, 'S04', 85, 5, 0, new Date(t)); // 90 first
  await quote({ auctionId: auction.id, buyerUserId: buyerUser.id, sellers }, 'S05', 82, 4, 4, new Date(t + 2000)); // 90 later
  await quote({ auctionId: auction.id, buyerUserId: buyerUser.id, sellers }, 'S02', 78, 6, 2, new Date(t + 4000)); // 86
  await quote({ auctionId: auction.id, buyerUserId: buyerUser.id, sellers }, 'S01', 80, 5, 3, new Date(t + 6000)); // 88
  await quote({ auctionId: auction.id, buyerUserId: buyerUser.id, sellers }, 'S03', 84, 5, 0, new Date(t + 8000)); // 89

  let ranks = await blindRanks(auction.id);
  check('A6 live bid count', ranks.count === 5, `${ranks.count} active quotes`);
  const order1: [SellerKey, number][] = [
    ['S02', 1],
    ['S01', 2],
    ['S03', 3],
    ['S04', 4],
    ['S05', 5],
  ];
  for (const [k, want] of order1) {
    const got = ranks.byCompany.get(sellers[k].companyId);
    check(`A7 blind rank ${k}`, got === want, `rank=${got} expected=${want}`);
  }
  check(
    'A8 tie-break (90.00 vs 90.00)',
    ranks.byCompany.get(sellers.S04.companyId) === 4 && ranks.byCompany.get(sellers.S05.companyId) === 5,
    'equal totals → earlier quote (S04) ranks ahead of later (S05)',
  );

  // ── S03 withdraws ──
  await db
    .update(bids)
    .set({ status: 'withdrawn', updatedAt: new Date() })
    .where(and(eq(bids.auctionId, auction.id), eq(bids.sellerCompanyId, sellers.S03.companyId)));
  ranks = await blindRanks(auction.id);
  check('A9 withdraw drops from count', ranks.count === 4, `${ranks.count} active after S03 withdrew`);
  check(
    'A10 ranks shift after withdraw',
    ranks.byCompany.get(sellers.S04.companyId) === 3 && ranks.byCompany.get(sellers.S05.companyId) === 4,
    'S04 #4→#3, S05 #5→#4',
  );

  // ── S01 revises DOWN to 85 (createdAt must NOT move — revision keeps priority) ──
  const [before] = await db
    .select({ createdAt: bids.createdAt })
    .from(bids)
    .where(and(eq(bids.auctionId, auction.id), eq(bids.sellerCompanyId, sellers.S01.companyId)));
  await db
    .update(bids)
    .set({
      stage1Basic: '79',
      stage1Freight: '4',
      stage1Tax: '2',
      stage1Total: String(computeTotalRate({ basic: 79, freight: 4, tax: 2, basis: 'delivered' })),
      updatedAt: new Date(),
    })
    .where(and(eq(bids.auctionId, auction.id), eq(bids.sellerCompanyId, sellers.S01.companyId)));
  const [after] = await db
    .select({ createdAt: bids.createdAt })
    .from(bids)
    .where(and(eq(bids.auctionId, auction.id), eq(bids.sellerCompanyId, sellers.S01.companyId)));
  ranks = await blindRanks(auction.id);
  check('A11 revise re-ranks to top', ranks.byCompany.get(sellers.S01.companyId) === 1, `S01 revised 88→85, rank=${ranks.byCompany.get(sellers.S01.companyId)}`);
  check('A12 revision keeps quote time', before!.createdAt.getTime() === after!.createdAt.getTime(), 'createdAt unchanged on revision');

  // Buyer-visible count (the auction page's definition).
  const visible = await db
    .select({ id: bids.id, status: bids.status })
    .from(bids)
    .where(and(eq(bids.auctionId, auction.id), isNotNull(bids.stage1Total)));
  const buyerCount = visible.filter((b) => b.status !== 'withdrawn').length;
  check('A13 buyer-visible bid count', buyerCount === 4, `${buyerCount} (withdrawn excluded)`);

  const state: SimState = { auctionId: auction.id, buyerUserId: buyerUser.id, sellers };
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\nState → ${STATE_FILE}`);
  console.log(`Auction: https://chem-bid-platform.vercel.app/auctions/${auction.id}`);
  console.log('Seller logins: s01@sim.test … s11@sim.test / Sim@12345');
}

async function phase2() {
  console.log('— Phase 2: close via cron → Stage-2 material round —\n');
  const state: SimState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const { auctionId, sellers } = state;

  // Past deadline, then the REAL deployed cron closes it.
  await db.update(auctions).set({ closesAt: new Date(Date.now() - 2 * 3600_000) }).where(eq(auctions.id, auctionId));
  const res = await fetch('https://chem-bid-platform.vercel.app/api/cron/close-auctions', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  const body = (await res.json()) as { processed?: number; awaiting?: number };
  const [closed] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  check(
    'B1 cron closes to awaiting_decision',
    res.status === 200 && closed!.status === 'awaiting_decision',
    `cron ${res.status} ${JSON.stringify(body)}; status=${closed!.status}`,
  );

  // Buyer counters on the MATERIAL rate (mirror of launchStage2Action).
  await db
    .update(auctions)
    .set({ stage: 'stage2', stage2Target: '75', stage2ClosesAt: new Date(Date.now() + 24 * 3600_000), stage2UrgencySent: false })
    .where(eq(auctions.id, auctionId));

  // Price-drop lock probe: S04 (material 85) tries final material 86 → must be rejected.
  check('B2 price-drop lock', isValidStage2Rate(86, 85) === false, 'final material 86 > S1 material 85 → rejected');

  // Responses: S02 accepts 75; S01 final 72; S04 rejects; S05 silent.
  check('B3 S01 final validates', isValidStage2Rate(72, 79) === true, 'final material 72 ≤ S1 material 79');
  const respond = (k: string, action: 'accept' | 'reject' | 'final', rate: string | null) =>
    db
      .update(bids)
      .set({ stage2Action: action, stage2Rate: rate, updatedAt: new Date() })
      .where(and(eq(bids.auctionId, auctionId), eq(bids.sellerCompanyId, sellers[k].companyId)));
  await respond('S02', 'accept', '75');
  await respond('S01', 'final', '72');
  await respond('S04', 'reject', null);

  // Effective totals: Stage-2 material + carried-over S1 freight+tax, lower-of.
  const rows = await db
    .select()
    .from(bids)
    .where(and(eq(bids.auctionId, auctionId), eq(bids.status, 'active'), isNotNull(bids.stage1Total)));
  const effOf = (companyId: string) => {
    const b = rows.find((r) => r.sellerCompanyId === companyId)!;
    return effectiveTotal(
      Number(b.stage1Total),
      b.stage2Rate ? stage2Total(Number(b.stage2Rate), b.stage1Freight, b.stage1Tax) : null,
    );
  };
  const expectEff: [string, number][] = [
    ['S01', 78], // min(85, 72+4+2)
    ['S02', 83], // min(86, 75+6+2)
    ['S04', 90], // rejected → S1 stands
    ['S05', 90], // silent → S1 stands
  ];
  for (const [k, want] of expectEff) {
    const got = effOf(sellers[k].companyId);
    check(`B4 effective ${k}`, got === want, `₹${got} (expected ₹${want})`);
  }
  const order = [...expectEff]
    .map(([k]) => ({ k, eff: effOf(sellers[k].companyId) }))
    .sort((a, b) => a.eff - b.eff)
    .map((x) => x.k);
  check('B5 winner is S01', order[0] === 'S01', `effective order: ${order.join(' → ')}`);

  console.log(`\nNow confirm the winner in the browser as the buyer:`);
  console.log(`https://chem-bid-platform.vercel.app/auctions/${auctionId}/review`);
}

async function main() {
  if (process.argv.includes('--phase2')) await phase2();
  else await phase1();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n══ ${results.length - failed.length}/${results.length} assertions passed ══`);
  if (failed.length > 0) {
    console.log('FAILED:');
    for (const f of failed) console.log(`  ✗ ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
