import { useState, type FormEvent } from 'react';
import { ShieldCheck, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { adminLogin, describeAdminError, setAdminToken } from '../api/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface Props {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    const result = await adminLogin(password);
    if (result.ok && result.token) {
      setAdminToken(result.token);
      onLogin(result.token);
      return;
    }
    setError(describeAdminError(result));
    setBusy(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-white">
      <div className="max-w-md w-full space-y-5">
        <div className="text-center space-y-3">
          <img src="/logo-3.png" alt="DILG Logo" className="h-16 mx-auto object-contain" />
          <div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              SURVEY ADMIN
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              DILG Client Satisfaction Survey — Responses &amp; Print
            </p>
          </div>
        </div>

        <Card className="rounded-3xl border border-black/[0.06] shadow-[0_1px_6px_-1px_rgba(0,25,70,0.12),0_6px_18px_-4px_rgba(0,25,70,0.08)]">
          <CardContent className="p-8 space-y-5">
            <form onSubmit={submit} className="space-y-4" noValidate>
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-bold">Admin access required</span>
              </div>

              <label className="block">
                <span className="block text-sm font-semibold text-foreground mb-1.5">
                  Password
                </span>
                <Input
                  type="password"
                  autoFocus
                  autoComplete="current-password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="rounded-xl"
                  aria-invalid={!!error}
                />
              </label>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={busy || !password}
                className="w-full rounded-full"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <a
          href="/"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to survey
        </a>
      </div>
    </div>
  );
}
