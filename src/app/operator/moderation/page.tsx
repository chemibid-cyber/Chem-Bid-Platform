import { eq, desc, aliasedTable } from 'drizzle-orm';
import { requireOperator } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { reports, companies } from '@/lib/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatIST } from '@/lib/format';
import { ResolveReportButton } from '../operator-controls';

export const metadata = { title: 'Moderation queue' };

const reporterCo = aliasedTable(companies, 'reporter_co');
const reportedCo = aliasedTable(companies, 'reported_co');

export default async function OperatorModeration() {
  await requireOperator();

  const rows = await db
    .select({
      report: reports,
      reporterName: reporterCo.legalName,
      reportedName: reportedCo.legalName,
    })
    .from(reports)
    .innerJoin(reporterCo, eq(reports.reporterCompanyId, reporterCo.id))
    .innerJoin(reportedCo, eq(reports.reportedCompanyId, reportedCo.id))
    .orderBy(desc(reports.createdAt));

  const open = rows.filter((r) => r.report.status === 'open');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Moderation queue</h1>
      {open.length === 0 ? (
        <p className="text-muted-foreground">No open reports.</p>
      ) : (
        <div className="space-y-3">
          {open.map((r) => (
            <Card key={r.report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {r.reporterName} reported {r.reportedName}
                  </CardTitle>
                  <Badge variant="warning">open</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatIST(r.report.createdAt)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">{r.report.reason}</div>
                <ResolveReportButton reportId={r.report.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
