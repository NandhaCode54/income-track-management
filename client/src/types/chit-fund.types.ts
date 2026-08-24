import type { PaymentStatus } from './payments.types';

export interface ChitPayment {
  id: string;
  month: number;
  year: number;
  amount: number;
  paidDate: string | null;
  dueDate: string;
  status: PaymentStatus;
}

/** Mirrors the server DTO with its derived totals. */
export interface ChitFund {
  id: string;
  name: string;
  organizer: string | null;
  totalAmount: number;
  monthlyAmount: number;
  totalMembers: number;
  startDate: string;
  endDate: string;
  dueDay: number;
  isActive: boolean;
  paidAmount: number;
  paidMonths: number;
  remainingAmount: number;
  payments: ChitPayment[];
}

export interface CreateChitFundPayload {
  name: string;
  organizer?: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMembers: number;
  startDate: string;
  endDate: string;
  dueDay: number;
}

export interface RecordChitPaymentPayload {
  month: number;
  year: number;
  amount: number;
  paidDate?: string;
}
