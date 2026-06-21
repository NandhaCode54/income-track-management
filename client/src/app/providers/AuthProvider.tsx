import { useEffect, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { QK } from '@/constants/queryKeys';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { accessToken, setUser, setMember, logout } = useAuthStore();

  useQuery({
    queryKey: QK.ME,
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      setUser(data.data.user);
      setMember(data.data.member);
      return data.data;
    },
    enabled: !!accessToken,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  useEffect(() => {
    if (!accessToken) logout();
  }, [accessToken, logout]);

  return <>{children}</>;
};
