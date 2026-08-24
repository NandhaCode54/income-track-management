import type { PaymentStatus } from '@prisma/client';
import type { ChitFundRow } from './chit-fund.repository';

export interface ChitPaymentDto {
  id: string;
  amount: number;
  month: number;
  year: number;
  dueDate: Date;
  paidDate: Date | null;
  status: PaymentStatus;
  notes: string | null;
}

export interface ChitFundDto {
  id: string;
  name: string;
  organizer: string | null;
  totalAmount: number;
  monthlyAmount: number;
  totalMembers: number;
  startDate: Date;
  endDate: Date;
  dueDay: number;
  isActive: boolean;
  notes: string | null;
  /** What has actually been paid so far, and how much remains. */
  paidAmount: number;
  paidMonths: number;
  remainingAmount: number;
  payments: ChitPaymentDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChitFundInput {
  name: string;
  organizer?: string;
  totalAmount: number;
  monthlyAmount: number;
  totalMembers: number;
  startDate: Date;
  endDate: Date;
  dueDay: number;
  notes?: string;
}

export interface RecordChitPaymentInput {
  month: number;
  year: number;
  amount?: number;
  paidDate?: Date;
  notes?: string;
}

/** A payment is only meaningful inside the fund's own running window. */
export const isMonthWithinFund = (fund: ChitFundRow, month: number, year: number): boolean => {
  const start = fund.startDate.getUTCFullYear() * 12 + fund.startDate.getUTCMonth();
  const end = fund.endDate.getUTCFullYear() * 12 + fund.endDate.getUTCMonth();
  const target = year * 12 + (month - 1);
  return target >= start && target <= end;
};
