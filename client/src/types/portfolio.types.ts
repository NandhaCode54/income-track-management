/** Local mirrors of the server's Prisma enums — the client has no Prisma client. */

export const INVESTMENT_TYPES = [
  'STOCKS',
  'MUTUAL_FUND',
  'FIXED_DEPOSIT',
  'PPF',
  'NPS',
  'GOLD',
  'CRYPTO',
  'REAL_ESTATE',
  'BONDS',
  'OTHER',
] as const;
export type InvestmentType = (typeof INVESTMENT_TYPES)[number];

export const ASSET_TYPES = [
  'VEHICLE',
  'PROPERTY',
  'ELECTRONICS',
  'JEWELRY',
  'FURNITURE',
  'LAND',
  'OTHER',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const LIABILITY_TYPES = [
  'HOME_LOAN',
  'CAR_LOAN',
  'PERSONAL_LOAN',
  'CREDIT_CARD',
  'EDUCATION_LOAN',
  'BUSINESS_LOAN',
  'OTHER',
] as const;
export type LiabilityType = (typeof LIABILITY_TYPES)[number];

export interface Investment {
  id: string;
  type: InvestmentType;
  name: string;
  investedAmount: number;
  currentValue: number;
  gainAmount: number;
  gainPercent: number | null;
  units: number | null;
  purchaseDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  value: number;
  purchaseValue: number | null;
  gainAmount: number | null;
  purchaseDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Liability {
  id: string;
  type: LiabilityType;
  name: string;
  amount: number;
  interestRate: number | null;
  dueDate: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NetWorth {
  investments: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

export type PortfolioKind = 'investment' | 'asset' | 'liability';

/** Route segment each ledger lives under on the server. */
export const PORTFOLIO_PATH: Record<PortfolioKind, string> = {
  investment: 'investments',
  asset: 'assets',
  liability: 'liabilities',
};

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  STOCKS: 'Stocks',
  MUTUAL_FUND: 'Mutual fund',
  FIXED_DEPOSIT: 'Fixed deposit',
  PPF: 'PPF',
  NPS: 'NPS',
  GOLD: 'Gold',
  CRYPTO: 'Crypto',
  REAL_ESTATE: 'Real estate',
  BONDS: 'Bonds',
  OTHER: 'Other',
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  VEHICLE: 'Vehicle',
  PROPERTY: 'Property',
  ELECTRONICS: 'Electronics',
  JEWELRY: 'Jewelry',
  FURNITURE: 'Furniture',
  LAND: 'Land',
  OTHER: 'Other',
};

export const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  HOME_LOAN: 'Home loan',
  CAR_LOAN: 'Car loan',
  PERSONAL_LOAN: 'Personal loan',
  CREDIT_CARD: 'Credit card',
  EDUCATION_LOAN: 'Education loan',
  BUSINESS_LOAN: 'Business loan',
  OTHER: 'Other',
};
