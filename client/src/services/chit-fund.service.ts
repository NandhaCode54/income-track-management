import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type {
  ChitFund,
  CreateChitFundPayload,
  RecordChitPaymentPayload,
} from '@/types/chit-fund.types';

export const chitFundApi = {
  async list(): Promise<ChitFund[]> {
    const { data } = await api.get<ApiEnvelope<{ chitFunds: ChitFund[] }>>('/chit-funds');
    return unwrap(data).chitFunds;
  },

  async create(payload: CreateChitFundPayload): Promise<ChitFund> {
    const { data } = await api.post<ApiEnvelope<{ chitFund: ChitFund }>>('/chit-funds', payload);
    return unwrap(data).chitFund;
  },

  async recordPayment(
    id: string,
    payload: RecordChitPaymentPayload,
  ): Promise<{ chitFund: ChitFund; payment: unknown }> {
    const { data } = await api.post<ApiEnvelope<{ chitFund: ChitFund; payment: unknown }>>(
      `/chit-funds/${id}/payments`,
      payload,
    );
    return unwrap(data);
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/chit-funds/${id}`);
    return data.message;
  },
};
