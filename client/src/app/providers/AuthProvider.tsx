import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { QK } from '@/constants/queryKeys';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, setUser, setMember, logout } = useAuthStore();

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
    // No token, or the session probe failed after refresh attempts — sign out.
    if (!accessToken || isError) logout();
  }, [accessToken, isError, logout]);

  return <>{children}</>;
};
