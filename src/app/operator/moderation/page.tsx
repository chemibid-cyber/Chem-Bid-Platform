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
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Moderation queue</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports filed by members against bad actors on the platform.
        </p>
      </div>
      {open.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No open reports.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {open.map((r) => (
            <Card key={r.report.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-display text-base tracking-tight">
                    {r.reporterName} reported {r.reportedName}
                  </CardTitle>
                  <Badge variant="warning">open</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatIST(r.report.createdAt)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl bg-muted/40 p-3 text-sm">{r.report.reason}</div>
                <ResolveReportButton reportId={r.report.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
