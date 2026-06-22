export const metadata = { title: 'Terms & Conditions' };

export default function TermsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Terms &amp; Conditions</h1>
      <p className="text-muted-foreground">Last updated: placeholder</p>

      <h2>1. Who we are</h2>
      <p>
        ChemiBid is operated by Two Clicks Media (&quot;the Platform&quot;). The Platform
        provides a venue for verified businesses to discover prices for chemical procurement through
        structured reverse auctions. The Platform is not a party to any transaction between buyers
        and sellers.
      </p>

      <h2>2. Eligibility &amp; identity</h2>
      <p>
        Accounts are anchored to a verified GST Identification Number (GSTIN). You confirm you are
        authorised to act for the registered business. Legal name and address are sourced from the
        GST network and may not be edited.
      </p>

      <h2>3. The Deal Confirmation Record</h2>
      <p>
        When both parties confirm a deal, the Platform issues a <strong>Deal Confirmation
        Record</strong>. This records the <strong>mutual intent</strong> of the parties under these
        Terms. It is <strong>not</strong> an automatically enforceable contract, and the Platform
        does not guarantee performance, payment, delivery, or quality. Settlement of money and goods
        happens off-platform between the parties.
      </p>

      <h2>4. Disputes</h2>
      <p>
        Either party may flag a confirmed deal as disputed. The Platform may facilitate a resolution
        process but is not an arbitrator of the underlying commercial relationship. Governing law,
        jurisdiction, and arbitration seat to be specified here following legal review.
      </p>

      <h2>5. Acceptable use</h2>
      <p>
        You agree not to post sham requirements to harvest competitor pricing, not to misrepresent
        your products, and not to misuse another party&apos;s confidential information disclosed
        during bidding.
      </p>

      <h2>6. Records</h2>
      <p>
        Every action on the Platform is recorded in an append-only audit trail. Records are retained
        for audit and dispute purposes as described in the Privacy Policy.
      </p>

      <p className="mt-8 text-muted-foreground">
        [Placeholder] Full clauses (limitation of liability, indemnity, governing law, arbitration)
        to be drafted by counsel.
      </p>
    </>
  );
}
