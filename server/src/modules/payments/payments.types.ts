import { PaymentStatus } from '@prisma/client';
import type { BillType, Frequency } from '@prisma/client';

// ── DTOs ─────────────────────────────────────────────────────────────────────
// Amounts cross the wire as numbers (converted once at this boundary), never as
// raw Prisma Decimals — JSON.stringify would turn those into strings and every
// client into a `Number(...)` wrapper.

export interface BillDto {
  kind: 'bill';
  id: string;
  type: BillType;
  name: string;
  providerName: string | null;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: PaymentStatus;
  isRecurring: boolean;
  frequency: Frequency;
  notes: string | null;
  createdAt: Date;
}

export interface RentDto {
  kind: 'rent';
  id: string;
  propertyName: string;
  landlordName: string | null;
  landlordPhone: string | null;
  amount: number;
  dueDay: number;
  dueDate: Date;
  paidDate: Date | null;
  status: PaymentStatus;
  month: number;
  year: number;
  notes: string | null;
  createdAt: Date;
}

export interface SchoolFeeDto {
  kind: 'schoolFee';
  id: string;
  studentName: string;
  school: string;
  class: string | null;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: PaymentStatus;
  term: string | null;
  academicYear: string | null;
  notes: string | null;
  createdAt: Date;
}

export type PaymentItemDto = BillDto | RentDto | SchoolFeeDto;

export interface PagedPayments {
  items: PaymentItemDto[];
  total: number;
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export interface ListQuery {
  status?: PaymentStatus;
  from?: Date;
  to?: Date;
  page: number;
  perPage: number;
}

export interface RecordPaymentInput {
  /** A payment cannot be recorded as PENDING or OVERDUE — that is the absence of one. */
  status: Exclude<PaymentStatus, 'PENDING' | 'OVERDUE'>;
  paidDate?: Date;
}

/** One CRUD surface shared by bills, rent and school fees. */
export interface PaymentSection {
  list(kind: PaymentKind, familyId: string, query: ListQuery): Promise<PagedPayments>;
  getById(kind: PaymentKind, familyId: string, id: string): Promise<PaymentItemDto>;
  create(
    kind: PaymentKind,
    familyId: string,
    input: BillCreate | RentCreate | SchoolFeeCreate,
  ): Promise<PaymentItemDto>;
  update(
    kind: PaymentKind,
    familyId: string,
    id: string,
    input: Partial<BillCreate | RentCreate | SchoolFeeCreate>,
  ): Promise<PaymentItemDto>;
  remove(kind: PaymentKind, familyId: string, id: string): Promise<void>;
  recordPayment(
    kind: PaymentKind,
    familyId: string,
    id: string,
    input: RecordPaymentInput,
  ): Promise<PaymentItemDto>;
}

export type PaymentKind = 'bill' | 'rent' | 'schoolFee';

export interface BillCreate {
  type: BillType;
  name: string;
  providerName?: string;
  amount: number;
  dueDate: Date;
  isRecurring?: boolean;
  frequency?: Frequency;
  notes?: string;
}

export interface RentCreate {
  propertyName: string;
  landlordName?: string;
  landlordPhone?: string;
  amount: number;
  dueDay: number;
  dueDate: Date;
  month: number;
  year: number;
  notes?: string;
}

export interface SchoolFeeCreate {
  studentName: string;
  school: string;
  class?: string;
  amount: number;
  dueDate: Date;
  term?: string;
  academicYear?: string;
  notes?: string;
}
