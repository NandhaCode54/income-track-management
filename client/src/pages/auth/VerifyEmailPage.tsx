import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authApi } from '@/services/auth.service';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';

type Status = 'verifying' | 'success' | 'error' | 'missing';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'missing');
  const [message, setMessage] = useState('');
  // Guard against React 18 StrictMode double-invocation in development.
  const attempted = useRef(false);

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    authApi
      .verifyEmail(token)
      .then((msg) => {
        setStatus('success');
        setMessage(msg);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(getApiErrorMessage(error, 'This verification link is invalid or has expired.'));
      });
  }, [token]);

  return (
    <div className="space-y-6 text-center">
      {status === 'verifying' && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verifying your email</h1>
            <p className="text-sm text-muted-foreground">Hang tight, this will only take a moment.</p>
          </div>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Email verified!</h1>
            <p className="text-sm text-muted-foreground">
              Your account is now active. You can sign in and start managing your finances.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={ROUTES.LOGIN}>Continue to login</Link>
          </Button>
        </>
      )}

      {(status === 'error' || status === 'missing') && (
        <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Verification failed</h1>
            <p className="text-sm text-muted-foreground">
              {status === 'missing'
                ? 'No verification token was provided in the link.'
                : message}
            </p>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link to={ROUTES.LOGIN}>Back to login</Link>
          </Button>
        </>
      )}
    </div>
  );
};

export default VerifyEmailPage;
