import { api } from './api';
import type {
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  User,
  Member,
} from '@/types/auth.types';

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const authApi = {
  async register(payload: RegisterPayload): Promise<{ message: string; verificationEmailSent: boolean }> {
    const { data } = await api.post<ApiEnvelope<{ verificationEmailSent: boolean }>>('/auth/register', payload);
    return { message: data.message, verificationEmailSent: data.data?.verificationEmailSent ?? true };
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', payload);
    return data.data as AuthResponse;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async me(): Promise<{ user: User; member: Member | null }> {
    const { data } = await api.get<ApiEnvelope<{ user: User; member: Member | null }>>('/auth/me');
    return data.data as { user: User; member: Member | null };
  },

  async verifyEmail(token: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<never>>('/auth/verify-email', { token });
    return data.message;
  },

  async resendVerification(email: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<never>>('/auth/resend-verification', { email });
    return data.message;
  },

  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<never>>('/auth/forgot-password', { email });
    return data.message;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<string> {
    const { data } = await api.post<ApiEnvelope<never>>('/auth/reset-password', payload);
    return data.message;
  },

  async updateProfile(payload: { firstName: string; lastName: string; phone?: string }): Promise<{ user: User }> {
    const { data } = await api.patch<ApiEnvelope<{ user: User }>>('/auth/me', payload);
    return data.data as { user: User };
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<string> {
    const { data } = await api.patch<ApiEnvelope<never>>('/auth/change-password', payload);
    return data.message;
  },
};
