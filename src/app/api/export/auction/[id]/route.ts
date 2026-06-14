import { getCurrentUser } from '@/lib/auth/session';
import { getAuctionExportData, toCsv, toPdf } from '@/lib/export/auction';
import { recordAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'auction';
}

/** Export a closed auction/deal as PDF or CSV. Buyer sees all bids; a participant
 *  seller sees only their own row. Anyone else gets 403. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const current = await getCurrentUser();
  if (!current) return new Response('Unauthorized', { status: 401 });

  const data = await getAuctionExportData(params.id, current.company.id, current.user);
  if (!data) return new Response('Not found', { status: 404 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') === 'pdf' ? 'pdf' : 'csv';
  const name = slug(data.auctionName);

  await recordAudit({
    actorUserId: current.user.id,
    entityType: 'auction',
    entityId: params.id,
    action: 'auction.exported',
    snapshot: { format },
  });

  if (format === 'pdf') {
    const bytes = await toPdf(data);
    // Copy into a fresh ArrayBuffer-backed view so it satisfies BodyInit.
    const body = new Uint8Array(bytes.byteLength);
    body.set(bytes);
    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}.pdf"`,
      },
    });
  }

  return new Response(toCsv(data), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}.csv"`,
    },
  });
}
