import { Prisma } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import {
  assetRepository,
  investmentRepository,
  liabilityRepository,
  netWorthOf,
} from './portfolio.repository';
import type {
  AssetDto,
  CreateAssetInput,
  CreateInvestmentInput,
  CreateLiabilityInput,
  EntityService,
  InvestmentDto,
  LiabilityDto,
  NetWorthDto,
  UpdateAssetInput,
  UpdateInvestmentInput,
  UpdateLiabilityInput,
} from './portfolio.types';

const toNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value.toFixed(2));

const round2 = (value: number): number => Math.round(value * 100) / 100;

const toInvestmentDto = (
  row: Awaited<ReturnType<typeof investmentRepository.findById>> & object,
): InvestmentDto => {
  const invested = toNumber(row.investedAmount) as number;
  const current = toNumber(row.currentValue) as number;
  const gain = round2(current - invested);

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    investedAmount: invested,
    currentValue: current,
    // A zero-cost basis has no meaningful percentage — `null`, not +Infinity.
    gainAmount: gain,
    gainPercent: invested === 0 ? null : Math.round((gain / invested) * 1000) / 10,
    units: toNumber(row.units),
    purchaseDate: row.purchaseDate,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const toAssetDto = (row: NonNullable<Awaited<ReturnType<typeof assetRepository.findById>>>): AssetDto => {
  const value = toNumber(row.value) as number;
  const purchaseValue = toNumber(row.purchaseValue);

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    value,
    purchaseValue,
    // Appreciation is only known against what was actually paid.
    gainAmount: purchaseValue === null ? null : round2(value - purchaseValue),
    purchaseDate: row.purchaseDate,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
};

const toLiabilityDto = (
  row: NonNullable<Awaited<ReturnType<typeof liabilityRepository.findById>>>,
): LiabilityDto => ({
  id: row.id,
  type: row.type,
  name: row.name,
  amount: toNumber(row.amount) as number,
  interestRate: toNumber(row.interestRate),
  dueDate: row.dueDate,
  description: row.description,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/** Scoped fetch-or-404, shared by every update/delete so a foreign id is invisible. */
async function requireRow<T>(
  find: () => Promise<T | null>,
  label: string,
): Promise<NonNullable<T>> {
  const row = await find();
  if (!row) throw new NotFoundError(label);
  return row;
}

export const investmentService: EntityService<
  CreateInvestmentInput,
  UpdateInvestmentInput,
  InvestmentDto
> = {
  async list(familyId) {
    const rows = await investmentRepository.list(familyId);
    return rows.map(toInvestmentDto);
  },
  async getById(familyId, id) {
    return toInvestmentDto(await requireRow(() => investmentRepository.findById(familyId, id), 'Investment'));
  },
  async create(familyId, input) {
    return toInvestmentDto(await investmentRepository.create(familyId, input));
  },
  async update(familyId, id, input) {
    await requireRow(() => investmentRepository.findById(familyId, id), 'Investment');
    return toInvestmentDto(await investmentRepository.update(id, input));
  },
  async remove(familyId, id) {
    await requireRow(() => investmentRepository.findById(familyId, id), 'Investment');
    await investmentRepository.delete(id);
  },
};

export const assetService: EntityService<CreateAssetInput, UpdateAssetInput, AssetDto> = {
  async list(familyId) {
    const rows = await assetRepository.list(familyId);
    return rows.map(toAssetDto);
  },
  async getById(familyId, id) {
    return toAssetDto(await requireRow(() => assetRepository.findById(familyId, id), 'Asset'));
  },
  async create(familyId, input) {
    return toAssetDto(await assetRepository.create(familyId, input));
  },
  async update(familyId, id, input) {
    await requireRow(() => assetRepository.findById(familyId, id), 'Asset');
    return toAssetDto(await assetRepository.update(id, input));
  },
  async remove(familyId, id) {
    await requireRow(() => assetRepository.findById(familyId, id), 'Asset');
    await assetRepository.delete(id);
  },
};

export const liabilityService: EntityService<
  CreateLiabilityInput,
  UpdateLiabilityInput,
  LiabilityDto
> = {
  async list(familyId) {
    const rows = await liabilityRepository.list(familyId);
    return rows.map(toLiabilityDto);
  },
  async getById(familyId, id) {
    return toLiabilityDto(await requireRow(() => liabilityRepository.findById(familyId, id), 'Liability'));
  },
  async create(familyId, input) {
    return toLiabilityDto(await liabilityRepository.create(familyId, input));
  },
  async update(familyId, id, input) {
    await requireRow(() => liabilityRepository.findById(familyId, id), 'Liability');
    return toLiabilityDto(await liabilityRepository.update(id, input));
  },
  async remove(familyId, id) {
    await requireRow(() => liabilityRepository.findById(familyId, id), 'Liability');
    await liabilityRepository.delete(id);
  },
};

/**
 * Investments and assets are what the family owns; liabilities are what it owes.
 * Each sum comes from SQL; the arithmetic happens once here on finished figures.
 */
export const netWorth = async (familyId: string): Promise<NetWorthDto> => {
  const [investments, assets, liabilities] = await netWorthOf(familyId);

  const investmentTotal = toNumber(investments._sum.currentValue) ?? 0;
  const assetTotal = toNumber(assets._sum.value) ?? 0;
  const liabilityTotal = toNumber(liabilities._sum.amount) ?? 0;

  return {
    investments: round2(investmentTotal),
    assets: round2(assetTotal),
    liabilities: round2(liabilityTotal),
    netWorth: round2(investmentTotal + assetTotal - liabilityTotal),
  };
};
