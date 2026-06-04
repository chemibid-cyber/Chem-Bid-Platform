/**
 * Transactional email templates. Plain, dependency-free HTML so it renders in
 * every client. All amounts/labels are passed in; nothing here invents data.
 */
const APP = 'Chemical Auction';

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="font-weight:700;font-size:18px;margin-bottom:16px">${APP}</div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      ${body}
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:16px">
      This is a transactional message from ${APP}. Actions on the platform are recorded under the Terms accepted at signup.
    </p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">${label}</a>`;
}

export interface Tmpl {
  subject: string;
  html: string;
  text: string;
}

export function inviteEmail(opts: {
  companyName: string;
  inviterName: string;
  acceptUrl: string;
}): Tmpl {
  return {
    subject: `You've been invited to ${opts.companyName} on ${APP}`,
    html: layout(
      'Set up your account',
      `<p>${opts.inviterName} invited you to join <strong>${opts.companyName}</strong> on ${APP}.</p>
       <p>Click below to set your password and sign in. The link expires for security.</p>
       <p style="margin:20px 0">${button(opts.acceptUrl, 'Accept invite & set password')}</p>`,
    ),
    text: `${opts.inviterName} invited you to join ${opts.companyName} on ${APP}. Set your password: ${opts.acceptUrl}`,
  };
}

export function resetPasswordEmail(opts: { resetUrl: string }): Tmpl {
  return {
    subject: `Reset your ${APP} password`,
    html: layout(
      'Reset your password',
      `<p>We received a request to reset your password. This link expires in 30 minutes.</p>
       <p style="margin:20px 0">${button(opts.resetUrl, 'Choose a new password')}</p>
       <p style="color:#64748b;font-size:13px">If you didn't request this, you can ignore this email.</p>`,
    ),
    text: `Reset your ${APP} password (expires in 30 min): ${opts.resetUrl}`,
  };
}

export function partnerRegisteredEmail(opts: {
  buyerName: string;
  cas: string;
  manageUrl: string;
}): Tmpl {
  return {
    subject: `${opts.buyerName} added you to their vendor network on ${APP}`,
    html: layout(
      'You were added to a private vendor network',
      `<p><strong>${opts.buyerName}</strong> registered your company as a partner for CAS <strong>${opts.cas}</strong>.</p>
       <p>You can review or decline this from your account.</p>
       <p style="margin:20px 0">${button(opts.manageUrl, 'Review network requests')}</p>`,
    ),
    text: `${opts.buyerName} added you as a partner for CAS ${opts.cas} on ${APP}. Review/decline: ${opts.manageUrl}`,
  };
}

export function sellerNotifiedEmail(opts: {
  productName: string;
  quantity: string;
  unit: string;
  viewUrl: string;
}): Tmpl {
  return {
    subject: `New requirement: ${opts.productName} (${opts.quantity} ${opts.unit.toUpperCase()})`,
    html: layout(
      'A buyer is requesting a quote',
      `<p>A verified buyer posted a requirement matching your catalog: <strong>${opts.productName}</strong>, ${opts.quantity} ${opts.unit.toUpperCase()}.</p>
       <p>Open it to Accept &amp; Quote, Ignore, or Block.</p>
       <p style="margin:20px 0">${button(opts.viewUrl, 'View requirement')}</p>`,
    ),
    text: `New requirement matching your catalog: ${opts.productName}, ${opts.quantity} ${opts.unit}. View: ${opts.viewUrl}`,
  };
}

export function stage2UrgencyEmail(opts: {
  productName: string;
  rate: string;
  unit: string;
  viewUrl: string;
}): Tmpl {
  return {
    // The ₹ rate is required to be in the subject line (FR-6.3).
    subject: `Final 2 hours — counter rate ₹${opts.rate}/${opts.unit.toUpperCase()} for ${opts.productName}`,
    html: layout(
      'Counter-offer closing soon',
      `<p>The buyer's counter rate is <strong>₹${opts.rate}/${opts.unit.toUpperCase()}</strong> for ${opts.productName}.</p>
       <p>You have under 2 hours to Accept, Reject, or submit a Final rate.</p>
       <p style="margin:20px 0">${button(opts.viewUrl, 'Respond now')}</p>`,
    ),
    text: `Final 2 hours. Counter rate ₹${opts.rate}/${opts.unit} for ${opts.productName}. Respond: ${opts.viewUrl}`,
  };
}

export function dealConfirmationEmail(opts: {
  counterpartyName: string;
  productName: string;
  quantity: string;
  unit: string;
  finalTotal: string;
  paymentTerms: string;
  leadTimeDays: number | null;
  tncUrl: string;
}): Tmpl {
  return {
    subject: `Deal Confirmation Record — ${opts.productName}`,
    html: layout(
      'Deal Confirmation Record',
      `<p>This records the mutual intent agreed between you and <strong>${opts.counterpartyName}</strong>.</p>
       <table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0">
         <tr><td style="padding:6px 0;color:#64748b">Product</td><td style="text-align:right"><strong>${opts.productName}</strong></td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Quantity</td><td style="text-align:right">${opts.quantity} ${opts.unit.toUpperCase()}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Final total rate</td><td style="text-align:right">₹${opts.finalTotal}/${opts.unit.toUpperCase()}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Payment terms</td><td style="text-align:right">${opts.paymentTerms}</td></tr>
         <tr><td style="padding:6px 0;color:#64748b">Lead time</td><td style="text-align:right">${opts.leadTimeDays ?? '—'} days</td></tr>
       </table>
       <p style="color:#475569;font-size:13px">This document records mutual intent under the <a href="${opts.tncUrl}">Terms &amp; Conditions</a> accepted at signup. It is not an auto-enforceable contract.</p>`,
    ),
    text: `Deal Confirmation Record with ${opts.counterpartyName}: ${opts.productName}, ${opts.quantity} ${opts.unit}, ₹${opts.finalTotal}/${opts.unit}, ${opts.paymentTerms}. Records mutual intent under the signup Terms (${opts.tncUrl}). Not an auto-enforceable contract.`,
  };
}
