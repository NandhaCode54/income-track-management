import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { authApi } from '@/services/auth.service';
import { loginSchema, type LoginForm } from '@/features/auth/auth.schemas';
import { useAuthStore } from '@/store/auth.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from '@/components/ui/toast';
import type { AxiosError } from 'axios';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, setMember, setAccessToken } = useAuthStore();
  const [needsVerification, setNeedsVerification] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setUser(data.user);
      if (data.member) setMember(data.member);
      toast.success('Welcome back!');
      navigate(ROUTES.DASHBOARD, { replace: true });
    },
    onError: (error) => {
      const status = (error as AxiosError).response?.status;
      if (status === 403) {
        setNeedsVerification(getValues('email'));
      }
      toast.error('Login failed', getApiErrorMessage(error));
    },
  });

  const resendMutation = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: (message) => toast.success('Email sent', message),
    onError: (error) => toast.error('Failed to resend', getApiErrorMessage(error)),
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your family workspace.
        </p>
      </div>

      {needsVerification && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium text-amber-700 dark:text-amber-400">Email not verified</p>
          <p className="mt-1 text-muted-foreground">
            Please verify your email to continue.{' '}
            <button
              type="button"
              className="font-medium text-primary hover:underline disabled:opacity-50"
              disabled={resendMutation.isPending}
              onClick={() => resendMutation.mutate(needsVerification)}
            >
              Resend verification email
            </button>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.REGISTER} className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
