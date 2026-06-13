/**
 * Swappable SMS-OTP provider seam — mirrors the GstVerificationProvider pattern.
 * Two implementations only (MockSmsProvider, Msg91Provider); resist gold-plating.
 */
export interface SmsSendResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface SmsOtpProvider {
  readonly name: string;
  /**
   * Deliver a one-time `code` to an E.164 `toE164` destination. MUST return
   * ok=false (never throw for ordinary delivery failures) so the caller can
   * avoid persisting a consumable code when the SMS never went out.
   */
  send(toE164: string, code: string): Promise<SmsSendResult>;
}
