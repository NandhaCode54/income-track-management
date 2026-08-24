import type { AssetType, InvestmentType, LiabilityType } from '@prisma/client';

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface InvestmentDto {
  id: string;
  type: InvestmentType;
  name: string;
  investedAmount: number;
  currentValue: number;
  /** Absolute gain/loss and percentage — derived here so every client agrees. */
  gainAmount: number;
  gainPercent: number | null;
  units: number | null;
  purchaseDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetDto {
  id: string;
  type: AssetType;
  name: string;
  value: number;
  purchaseValue: number | null;
  /** Appreciation against what was paid, when the purchase value is known. */
  gainAmount: number | null;
  purchaseDate: Date | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LiabilityDto {
  id: string;
  type: LiabilityType;
  name: string;
  amount: number;
  interestRate: number | null;
  dueDate: Date | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface NetWorthDto {
  investments: number;
  assets: number;
  liabilities: number;
  netWorth: number;
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export interface CreateInvestmentInput {
  type: InvestmentType;
  name: string;
  investedAmount: number;
  currentValue: number;
  units?: number;
  purchaseDate: Date;
  notes?: string;
}

export type UpdateInvestmentInput = Partial<CreateInvestmentInput>;

export interface CreateAssetInput {
  type: AssetType;
  name: string;
  value: number;
  purchaseValue?: number;
  purchaseDate?: Date;
  description?: string;
}

export type UpdateAssetInput = Partial<CreateAssetInput>;

export interface CreateLiabilityInput {
  type: LiabilityType;
  name: string;
  amount: number;
  interestRate?: number;
  dueDate?: Date;
  description?: string;
}

export type UpdateLiabilityInput = Partial<CreateLiabilityInput>;

/**
 * One CRUD surface per entity, so the controller can be written once against
 * this shape instead of once per model. The generic keeps every call site fully
 * typed — no `any` escapes into Express-land.
 */
export interface EntityService<TCreate, TUpdate, TDto> {
  list(familyId: string): Promise<TDto[]>;
  getById(familyId: string, id: string): Promise<TDto>;
  create(familyId: string, input: TCreate): Promise<TDto>;
  update(familyId: string, id: string, input: TUpdate): Promise<TDto>;
  remove(familyId: string, id: string): Promise<void>;
}
