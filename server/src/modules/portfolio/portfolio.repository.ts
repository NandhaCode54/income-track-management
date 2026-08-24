import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import type {
  CreateAssetInput,
  CreateInvestmentInput,
  CreateLiabilityInput,
  UpdateAssetInput,
  UpdateInvestmentInput,
  UpdateLiabilityInput,
} from './portfolio.types';

/**
 * One repository for the three portfolio ledgers. The models are too different
 * (different money fields, optional dates) for a generic delegate to stay
 * honest, so each entity gets its own explicit methods — verbose, but the
 * compiler checks every field name and there is no `any` in sight.
 *
 * Every method is scoped by `familyId`; a foreign id resolves to `null` → 404,
 * never someone else's row.
 */

const decimal = (value: number): Prisma.Decimal => new Prisma.Decimal(value.toFixed(2));

// ── Investments ──────────────────────────────────────────────────────────────

export const investmentRepository = {
  list(familyId: string) {
    return prisma.investment.findMany({ where: { familyId }, orderBy: { createdAt: 'desc' } });
  },
  findById(familyId: string, id: string) {
    return prisma.investment.findFirst({ where: { id, familyId } });
  },
  create(familyId: string, input: CreateInvestmentInput) {
    return prisma.investment.create({
      data: {
        familyId,
        type: input.type,
        name: input.name,
        investedAmount: decimal(input.investedAmount),
        currentValue: decimal(input.currentValue),
        ...(input.units !== undefined ? { units: new Prisma.Decimal(input.units.toFixed(4)) } : {}),
        purchaseDate: input.purchaseDate,
        notes: input.notes ?? null,
      },
    });
  },
  update(id: string, input: UpdateInvestmentInput) {
    const data: Prisma.InvestmentUpdateInput = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.name !== undefined) data.name = input.name;
    if (input.investedAmount !== undefined) data.investedAmount = decimal(input.investedAmount);
    if (input.currentValue !== undefined) data.currentValue = decimal(input.currentValue);
    // Absent = leave alone; present-but-cleared = null.
    if ('units' in input) data.units = input.units === undefined ? null : new Prisma.Decimal(input.units.toFixed(4));
    if (input.purchaseDate !== undefined) data.purchaseDate = input.purchaseDate;
    if ('notes' in input) data.notes = input.notes ?? null;
    return prisma.investment.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.investment.delete({ where: { id } }).then(() => undefined);
  },
};

// ── Assets ───────────────────────────────────────────────────────────────────

export const assetRepository = {
  list(familyId: string) {
    return prisma.asset.findMany({ where: { familyId }, orderBy: { createdAt: 'desc' } });
  },
  findById(familyId: string, id: string) {
    return prisma.asset.findFirst({ where: { id, familyId } });
  },
  create(familyId: string, input: CreateAssetInput) {
    return prisma.asset.create({
      data: {
        familyId,
        type: input.type,
        name: input.name,
        value: decimal(input.value),
        ...(input.purchaseValue !== undefined ? { purchaseValue: decimal(input.purchaseValue) } : {}),
        ...(input.purchaseDate !== undefined ? { purchaseDate: input.purchaseDate } : {}),
        description: input.description ?? null,
      },
    });
  },
  update(id: string, input: UpdateAssetInput) {
    const data: Prisma.AssetUpdateInput = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.name !== undefined) data.name = input.name;
    if (input.value !== undefined) data.value = decimal(input.value);
    if ('purchaseValue' in input) {
      data.purchaseValue = input.purchaseValue === undefined ? null : decimal(input.purchaseValue);
    }
    if ('purchaseDate' in input) data.purchaseDate = input.purchaseDate ?? null;
    if ('description' in input) data.description = input.description ?? null;
    return prisma.asset.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.asset.delete({ where: { id } }).then(() => undefined);
  },
};

// ── Liabilities ──────────────────────────────────────────────────────────────

export const liabilityRepository = {
  list(familyId: string) {
    return prisma.liability.findMany({ where: { familyId }, orderBy: { createdAt: 'desc' } });
  },
  findById(familyId: string, id: string) {
    return prisma.liability.findFirst({ where: { id, familyId } });
  },
  create(familyId: string, input: CreateLiabilityInput) {
    return prisma.liability.create({
      data: {
        familyId,
        type: input.type,
        name: input.name,
        amount: decimal(input.amount),
        ...(input.interestRate !== undefined
          ? { interestRate: new Prisma.Decimal(input.interestRate.toFixed(2)) }
          : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        description: input.description ?? null,
      },
    });
  },
  update(id: string, input: UpdateLiabilityInput) {
    const data: Prisma.LiabilityUpdateInput = {};
    if (input.type !== undefined) data.type = input.type;
    if (input.name !== undefined) data.name = input.name;
    if (input.amount !== undefined) data.amount = decimal(input.amount);
    if ('interestRate' in input) {
      data.interestRate =
        input.interestRate === undefined
          ? null
          : new Prisma.Decimal(input.interestRate.toFixed(2));
    }
    if ('dueDate' in input) data.dueDate = input.dueDate ?? null;
    if ('description' in input) data.description = input.description ?? null;
    return prisma.liability.update({ where: { id }, data });
  },
  delete(id: string) {
    return prisma.liability.delete({ where: { id } }).then(() => undefined);
  },
};

// ── Net worth ────────────────────────────────────────────────────────────────

/**
 * Three independent sums, aggregated in SQL — fetching every row to add in Node
 * would scale with the family's history; `aggregate` scales with nothing.
 */
export const netWorthOf = (familyId: string) =>
  prisma.$transaction([
    prisma.investment.aggregate({ where: { familyId }, _sum: { currentValue: true } }),
    prisma.asset.aggregate({ where: { familyId }, _sum: { value: true } }),
    prisma.liability.aggregate({ where: { familyId }, _sum: { amount: true } }),
  ]);
