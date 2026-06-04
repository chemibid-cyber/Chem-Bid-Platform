/**
 * Cron route guard. Vercel Cron attaches `Authorization: Bearer <CRON_SECRET>`
 * when CRON_SECRET is set in the project env. Reject anything else.
 */
export function isAuthorizedCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}
