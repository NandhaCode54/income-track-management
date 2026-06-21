import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  isVerified: boolean;
}

export interface MemberInfo {
  id: string;
  familyId: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  member: MemberInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setUser: (user: AuthUser) => void;
  setMember: (member: MemberInfo) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      member: null,
      accessToken: null,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: true }),
      setMember: (member) => set({ member }),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, member: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'ffm-auth',
      partialize: (state) => ({ user: state.user, member: state.member, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
