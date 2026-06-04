export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: placeholder · DPDP Act 2023 aligned</p>

      <h2>1. What we collect</h2>
      <p>
        Company identity (GSTIN, legal name, registered address sourced from the GST network),
        user details you provide (name, corporate email, phone, designation, team), catalog and
        auction data, and platform activity recorded in our audit trail.
      </p>

      <h2>2. Why we process it</h2>
      <p>
        To verify business identity, match buyers and sellers, run auctions, record deals, and keep
        a tamper-evident history. We process data on the basis of your consent and to perform the
        service you signed up for.
      </p>

      <h2>3. Your rights (DPDP)</h2>
      <p>
        You may request a copy of your data (export) and request deletion of your account. Deletion
        soft-disables your account and queues a purge of personal data, subject to a legal hold
        where an open dispute requires retention. Audit history is preserved in de-identified form
        where required.
      </p>

      <h2>4. No children&apos;s data</h2>
      <p>This is a business-to-business platform. We do not knowingly process data of minors.</p>

      <h2>5. Sharing &amp; identity masking</h2>
      <p>
        During blind bidding, seller identities and competitor prices are masked. A seller&apos;s
        identity is revealed to the buyer only after that seller Accepts a requirement (or after the
        auction closes). We do not sell your personal data.
      </p>

      <h2>6. Retention &amp; breach</h2>
      <p>
        Auction and deal records are retained for audit. We maintain a breach log and are prepared
        to notify affected parties within 72 hours of a confirmed breach.
      </p>

      <p className="mt-8 text-muted-foreground">
        [Placeholder] Data Protection Officer contact, grievance redressal, and retention schedules
        to be finalised with counsel.
      </p>
    </>
  );
}
