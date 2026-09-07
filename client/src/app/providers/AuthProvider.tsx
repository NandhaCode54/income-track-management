import { useEffect, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { QK } from '@/constants/queryKeys';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, setUser, setMember, setAccessToken, logout } = useAuthStore();

  // Restore a session on full-page reload. The access token is memory-only, so
  // on boot there is no bearer to attach — the HttpOnly refresh cookie is the
  // credential. `authApi.refresh` returns user + member + accessToken together;
  // the `/me` probe below stays enabled now that the token exists and re-syncs.
  const bootstrap = useMutation({
    mutationFn: authApi.refresh,
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      if (session.user) setUser(session.user);
      if (session.member) setMember(session.member);
    },
    onError: () => logout(),
  });

  useEffect(() => {
    if (!accessToken) bootstrap.mutate();
  }, [accessToken, bootstrap]);

  const { data, isError } = useQuery({
    queryKey: QK.ME,
    queryFn: authApi.me,
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setUser(data.user);
      if (data.member) setMember(data.member);
    }
  }, [data, setUser, setMember]);

  useEffect(() => {
    // A failed `/me` with an existing token means refresh+retry already ran in
    // the interceptor and the session is truly gone — sign out cleanly. The
    // boot path never hits this branch because it has no token yet.
    if (isError) logout();
  }, [isError, logout]);

  return <>{children}</>;
};
