import { api } from './api';
import { unwrap, type ApiEnvelope, type PaginationMeta } from '@/types/api.types';
import {
  PAYMENT_PATH,
  type BillType,
  type Frequency,
  type PaymentFilters,
  type PaymentItem,
  type PaymentKind,
  type PaymentStatus,
} from '@/types/payments.types';

/** Explicit payloads — the wire shape differs from the row shape (no ids/status). */
export interface BillPayload {
  type: BillType;
  name: string;
  providerName?: string;
  amount: number;
  dueDate: string;
  isRecurring: boolean;
  frequency?: Frequency;
  notes?: string;
}

export interface RentPayload {
  propertyName: string;
  landlordName?: string;
  landlordPhone?: string;
  amount: number;
  dueDay: number;
  month: number;
  year: number;
  notes?: string;
}

export interface SchoolFeePayload {
  studentName: string;
  school: string;
  class?: string;
  amount: number;
  dueDate: string;
  term?: string;
  academicYear?: string;
  notes?: string;
}

export type PaymentPayload = BillPayload | RentPayload | SchoolFeePayload;

/** A payment is settled with a status; only real payments carry a date. */
export interface RecordPaymentPayload {
  status: Exclude<PaymentStatus, 'PENDING' | 'OVERDUE'>;
  paidDate?: string;
}

const pathOf = (kind: PaymentKind): string => `/${PAYMENT_PATH[kind]}`;

export const paymentsApi = {
  async list(
    kind: PaymentKind,
    filters: PaymentFilters = {},
  ): Promise<{ items: PaymentItem[]; meta?: PaginationMeta }> {
    const { data } = await api.get<ApiEnvelope<{ items: PaymentItem[] }>>(pathOf(kind), {
      params: { ...filters, status: filters.status || undefined },
    });
    const payload = unwrap(data);
    return { items: payload.items, meta: data.meta };
  },

  async create(kind: PaymentKind, payload: PaymentPayload): Promise<PaymentItem> {
    const { data } = await api.post<ApiEnvelope<{ item: PaymentItem }>>(pathOf(kind), payload);
    return unwrap(data).item;
  },

  async update(
    kind: PaymentKind,
    id: string,
    payload: Partial<PaymentPayload>,
  ): Promise<PaymentItem> {
    const { data } = await api.patch<ApiEnvelope<{ item: PaymentItem }>>(
      `${pathOf(kind)}/${id}`,
      payload,
    );
    return unwrap(data).item;
  },

  async recordPayment(
    kind: PaymentKind,
    id: string,
    payload: RecordPaymentPayload,
  ): Promise<PaymentItem> {
    const { data } = await api.post<ApiEnvelope<{ item: PaymentItem }>>(
      `${pathOf(kind)}/${id}/payment`,
      payload,
    );
    return unwrap(data).item;
  },

  async remove(kind: PaymentKind, id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`${pathOf(kind)}/${id}`);
    return data.message;
  },
};
