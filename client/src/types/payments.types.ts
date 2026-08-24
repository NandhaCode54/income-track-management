/** Local mirrors of the server's Prisma enums — the client has no Prisma client. */

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'WAIVED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const BILL_TYPES = [
  'ELECTRICITY',
  'WATER',
  'GAS',
  'INTERNET',
  'PHONE',
  'CABLE_TV',
  'INSURANCE',
  'SUBSCRIPTION',
  'OTHER',
] as const;
export type BillType = (typeof BILL_TYPES)[number];

export const FREQUENCIES = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export type PaymentKind = 'bill' | 'rent' | 'schoolFee';

/** Route segment each kind lives under on the server. */
export const PAYMENT_PATH: Record<PaymentKind, string> = {
  bill: 'bills',
  rent: 'rent',
  schoolFee: 'school-fees',
};

interface PaymentFields {
  id: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
}

export interface Bill extends PaymentFields {
  /** Literal tags let the union narrow in JSX without casts. */
  kind: 'bill';
  type: BillType;
  name: string;
  providerName: string | null;
  isRecurring: boolean;
  frequency: Frequency;
}

export interface Rent extends PaymentFields {
  kind: 'rent';
  propertyName: string;
  landlordName: string | null;
  landlordPhone: string | null;
  dueDay: number;
  month: number;
  year: number;
}

export interface SchoolFee extends PaymentFields {
  kind: 'schoolFee';
  studentName: string;
  school: string;
  class: string | null;
  term: string | null;
  academicYear: string | null;
}

export type PaymentItem = Bill | Rent | SchoolFee;

export interface PaymentFilters {
  status?: PaymentStatus | '';
  page?: number;
  perPage?: number;
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  PARTIAL: 'Partially paid',
  OVERDUE: 'Overdue',
  WAIVED: 'Waived',
};

export const BILL_TYPE_LABELS: Record<BillType, string> = {
  ELECTRICITY: 'Electricity',
  WATER: 'Water',
  GAS: 'Gas',
  INTERNET: 'Internet',
  PHONE: 'Phone',
  CABLE_TV: 'Cable TV',
  INSURANCE: 'Insurance',
  SUBSCRIPTION: 'Subscription',
  OTHER: 'Other',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  YEARLY: 'Yearly',
};
