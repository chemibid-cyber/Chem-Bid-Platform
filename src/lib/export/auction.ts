import { and, eq, isNotNull, asc } from 'drizzle-orm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { db } from '@/lib/db';
import { auctions, bids, companies } from '@/lib/db/schema';
import { effectiveTotal } from '@/lib/ranking';
import { stage2Total } from '@/lib/pricing';
import { UNIT_LABEL, PAYMENT_TERMS_LABEL } from '@/lib/format';

export interface ExportRow {
  seller: string;
  basic: string;
  freight: string;
  tax: string;
  stage1Total: string;
  stage2Rate: string;
  effective: string;
  paymentTerms: string;
  leadTime: string;
  status: string;
}

export interface ExportData {
  auctionName: string;
  casNumber: string | null;
  quantity: string;
  unit: string;
  buyerName: string;
  isBuyer: boolean;
  rows: ExportRow[];
}

/** Returns export data scoped to the viewer (buyer sees all; a seller sees only their row). */
export async function getAuctionExportData(
  auctionId: string,
  companyId: string,
): Promise<ExportData | null> {
  const [auction] = await db.select().from(auctions).where(eq(auctions.id, auctionId)).limit(1);
  if (!auction) return null;

  const isBuyer = auction.buyerCompanyId === companyId;

  const all = await db
    .select({
      sellerCompanyId: bids.sellerCompanyId,
      seller: companies.legalName,
      basic: bids.stage1Basic,
      freight: bids.stage1Freight,
      tax: bids.stage1Tax,
      stage1Total: bids.stage1Total,
      stage2Rate: bids.stage2Rate,
      paymentTerms: bids.paymentTerms,
      leadTimeDays: bids.leadTimeDays,
      status: bids.status,
    })
    .from(bids)
    .innerJoin(companies, eq(bids.sellerCompanyId, companies.id))
    .where(and(eq(bids.auctionId, auctionId), isNotNull(bids.stage1Total)))
    .orderBy(asc(bids.stage1Total), asc(bids.createdAt));

  // Authorization: viewer must be the buyer OR a participating seller.
  const sellerRow = all.find((b) => b.sellerCompanyId === companyId);
  if (!isBuyer && !sellerRow) return null;

  const visible = isBuyer ? all : all.filter((b) => b.sellerCompanyId === companyId);

  const [buyerCompany] = await db
    .select({ legalName: companies.legalName })
    .from(companies)
    .where(eq(companies.id, auction.buyerCompanyId))
    .limit(1);

  const rows: ExportRow[] = visible.map((b) => {
    const eff = effectiveTotal(
      Number(b.stage1Total),
      b.stage2Rate ? stage2Total(Number(b.stage2Rate), b.freight, b.tax) : null,
    );
    return {
      seller: b.seller,
      basic: b.basic ?? '',
      freight: b.freight ?? '0',
      tax: b.tax ?? '0',
      stage1Total: b.stage1Total ?? '',
      stage2Rate: b.stage2Rate ?? '',
      effective: eff.toFixed(2),
      paymentTerms: b.paymentTerms ? PAYMENT_TERMS_LABEL[b.paymentTerms] ?? b.paymentTerms : '',
      leadTime: b.leadTimeDays != null ? String(b.leadTimeDays) : '',
      status: b.status,
    };
  });

  return {
    auctionName: auction.name,
    casNumber: auction.casNumber,
    quantity: auction.quantity,
    unit: UNIT_LABEL[auction.unit] ?? auction.unit,
    buyerName: buyerCompany?.legalName ?? '',
    isBuyer,
    rows,
  };
}

function csvCell(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(data: ExportData): string {
  const header = [
    'Seller',
    `Material (INR/${data.unit})`,
    `Transport (INR/${data.unit})`,
    `Tax (INR/${data.unit})`,
    `Stage-1 total (INR/${data.unit})`,
    `Stage-2 material (INR/${data.unit})`,
    `Effective (INR/${data.unit})`,
    'Payment terms',
    'Lead time (days)',
    'Status',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of data.rows) {
    lines.push(
      [r.seller, r.basic, r.freight, r.tax, r.stage1Total, r.stage2Rate, r.effective, r.paymentTerms, r.leadTime, r.status]
        .map(csvCell)
        .join(','),
    );
  }
  return `Auction,${csvCell(data.auctionName)}\nCAS,${csvCell(data.casNumber ?? 'N/A')}\nQuantity,${csvCell(`${data.quantity} ${data.unit}`)}\nBuyer,${csvCell(data.buyerName)}\n\n${lines.join('\n')}\n`;
}

/** pdf-lib standard fonts use WinAnsi — no rupee glyph, so amounts are labelled INR. */
export async function toPdf(data: ExportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([595, 842]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;

  const line = (text: string, opts: { size?: number; bold?: boolean; gap?: number; x?: number } = {}) => {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: opts.x ?? 50,
      y,
      size: opts.size ?? 10,
      font: opts.bold ? bold : font,
      color: rgb(0.05, 0.05, 0.08),
    });
    y -= opts.gap ?? 16;
  };

  line('Chemical Auction — Record', { size: 16, bold: true, gap: 24 });
  line(`Auction: ${data.auctionName}`, { bold: true });
  line(`CAS: ${data.casNumber ?? 'N/A (mixture)'}`);
  line(`Quantity: ${data.quantity} ${data.unit}`);
  line(`Buyer: ${data.buyerName}`, { gap: 22 });

  line('Bids (amounts in INR per unit)', { bold: true, gap: 18 });
  for (const r of data.rows) {
    line(`${r.seller}  [${r.status}]`, { bold: true, gap: 14 });
    line(
      `  S1 total ${r.stage1Total} (mat ${r.basic} + trans ${r.freight} + tax ${r.tax})  |  S2 mat ${r.stage2Rate || '-'}  |  effective ${r.effective}  |  ${r.paymentTerms || '-'}  |  lead ${r.leadTime || '-'}d`,
      { size: 9, gap: 18 },
    );
  }

  line('This document records mutual intent under the Terms accepted at signup.', {
    size: 8,
    gap: 12,
  });
  line('It is not an automatically enforceable contract.', { size: 8 });

  return doc.save();
}
