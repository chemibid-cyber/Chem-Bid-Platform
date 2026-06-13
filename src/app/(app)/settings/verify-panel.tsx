'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { requestContactOtpAction, verifyContactOtpAction, type VerifyFormState } from './verify-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Channel = 'email' | 'phone';

function ChannelRow(props: {
  channel: Channel;
  label: string;
  value: string;
  verified: boolean;
  smsLive: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [phone, setPhone] = useState(props.value);
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'idle' | 'sent'>('idle');
  const [msg, setMsg] = useState<VerifyFormState>(null);

  function send() {
    setMsg(null);
    start(async () => {
      const r = await requestContactOtpAction(props.channel, props.channel === 'phone' ? phone : undefined);
      setMsg(r);
      if (r?.success) setStage('sent');
    });
  }

  function verify() {
    setMsg(null);
    start(async () => {
      const r = await verifyContactOtpAction(props.channel, code);
      setMsg(r);
      if (r?.success) {
        setStage('idle');
        setCode('');
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{props.label}</p>
          {props.channel === 'phone' && !props.verified ? (
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              inputMode="tel"
              className="mt-1 max-w-[220px]"
              aria-label="Phone number"
            />
          ) : (
            <p className="mt-0.5 text-sm font-medium">{props.value || '—'}</p>
          )}
        </div>
        {props.verified ? (
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
          </Badge>
        ) : (
          <Badge variant="warning">Unverified</Badge>
        )}
      </div>

      {!props.verified ? (
        <div className="mt-3 space-y-3">
          {stage === 'idle' ? (
            <Button type="button" size="sm" variant="secondary" onClick={send} disabled={pending}>
              {pending ? 'Sending…' : 'Send code'}
            </Button>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor={`code-${props.channel}`} className="text-xs">
                  Enter the 6-digit code
                </Label>
                <Input
                  id={`code-${props.channel}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  className="max-w-[140px] tracking-[0.4em]"
                />
              </div>
              <Button type="button" size="sm" onClick={verify} disabled={pending || code.length !== 6}>
                {pending ? 'Checking…' : 'Verify'}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={send} disabled={pending}>
                Resend
              </Button>
            </div>
          )}

          {props.channel === 'phone' && !props.smsLive ? (
            <p className="text-xs text-muted-foreground">
              Phone verification by SMS turns on once our SMS provider + India DLT registration are
              live. Email verification works now.
            </p>
          ) : null}

          {msg?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{msg.error}</AlertDescription>
            </Alert>
          ) : null}
          {msg?.success ? (
            <Alert>
              <AlertDescription>{msg.success}</AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function VerifyPanel(props: {
  email: string;
  emailVerified: boolean;
  phone: string;
  phoneVerified: boolean;
  smsLive: boolean;
}) {
  return (
    <div className="space-y-3">
      <ChannelRow channel="email" label="Email" value={props.email} verified={props.emailVerified} smsLive />
      <ChannelRow
        channel="phone"
        label="Phone"
        value={props.phone}
        verified={props.phoneVerified}
        smsLive={props.smsLive}
      />
    </div>
  );
}
