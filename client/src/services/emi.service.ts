import { api } from './api';
import { unwrap, type ApiEnvelope, type PaginationMeta } from '@/types/api.types';
import type {
  CalculatorInput,
  CalculatorResult,
  Emi,
  EmiDetail,
  EmiFilters,
  EmiPayload,
  EmiPayment,
  EmiTotals,
  RecordPaymentPayload,
  UpcomingEmis,
} from '@/types/emi.types';

export const emiApi = {
  async list(
    filters: EmiFilters,
  ): Promise<{ emis: Emi[]; totals: EmiTotals; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ emis: Emi[]; totals: EmiTotals }>>('/emi', {
      params: filters,
    });
    const payload = unwrap(data);
    return { emis: payload.emis, totals: payload.totals, meta: data.meta };
  },

  async getOne(id: string): Promise<EmiDetail> {
    const { data } = await api.get<ApiEnvelope<{ emi: EmiDetail }>>(`/emi/${id}`);
    return unwrap(data).emi;
  },

  async payments(id: string): Promise<EmiPayment[]> {
    const { data } = await api.get<ApiEnvelope<{ payments: EmiPayment[] }>>(`/emi/${id}/payments`);
    return unwrap(data).payments;
  },

  async upcoming(days: number): Promise<UpcomingEmis> {
    const { data } = await api.get<ApiEnvelope<{ upcoming: UpcomingEmis }>>('/emi/upcoming', {
      params: { days },
    });
    return unwrap(data).upcoming;
  },

  /** Pure maths on the server — nothing is stored, so this is safe to call as you type. */
  async calculate(input: CalculatorInput): Promise<CalculatorResult> {
    const { data } = await api.get<ApiEnvelope<{ calculation: CalculatorResult }>>(
      '/emi/calculator',
      { params: input },
    );
    return unwrap(data).calculation;
  },

  async create(payload: EmiPayload): Promise<Emi> {
    const { data } = await api.post<ApiEnvelope<{ emi: Emi }>>('/emi', payload);
    return unwrap(data).emi;
  },

  async update(id: string, payload: Partial<EmiPayload>): Promise<Emi> {
    const { data } = await api.patch<ApiEnvelope<{ emi: Emi }>>(`/emi/${id}`, payload);
    return unwrap(data).emi;
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/emi/${id}`);
    return data.message;
  },

  async recordPayment(id: string, payload: RecordPaymentPayload): Promise<Emi> {
    const { data } = await api.post<ApiEnvelope<{ emi: Emi }>>(`/emi/${id}/payment`, payload);
    return unwrap(data).emi;
  },
};
