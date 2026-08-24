import { PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../shared/errors/NotFoundError';

type Kind = 'bill' | 'rent' | 'schoolFee';
const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const scoped = (kind: Kind, familyId: string, id: string) => {
  const model: any = kind === 'bill' ? prisma.bill : kind === 'rent' ? prisma.rent : prisma.schoolFee;
  return model.findFirst({ where: { id, familyId } });
};

const modelFor = (kind: Kind): any => kind === 'bill' ? prisma.bill : kind === 'rent' ? prisma.rent : prisma.schoolFee;

export const paymentsService = {
  async list(kind: Kind, familyId: string, query: { status?: PaymentStatus; from?: Date; to?: Date; page: number; perPage: number }) {
    const model = modelFor(kind);
    const dateKey = 'dueDate';
    const where: any = { familyId, ...(query.status ? { status: query.status } : {}), ...((query.from || query.to) ? { [dateKey]: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}) };
    const [items, total] = await prisma.$transaction([
      model.findMany({ where, orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }], skip: (query.page - 1) * query.perPage, take: query.perPage }),
      model.count({ where }),
    ]);
    return { items, total };
  },
  async get(kind: Kind, familyId: string, id: string) {
    const item = await scoped(kind, familyId, id);
    if (!item) throw new NotFoundError(kind);
    return item;
  },
  async create(kind: Kind, familyId: string, input: any) {
    const model = modelFor(kind);
    const data = { ...input, amount: decimal(input.amount), familyId } as any;
    return model.create({ data });
  },
  async update(kind: Kind, familyId: string, id: string, input: any) {
    await this.get(kind, familyId, id);
    const data = { ...input, ...(input.amount !== undefined ? { amount: decimal(input.amount) } : {}) };
    return (modelFor(kind) as any).update({ where: { id }, data });
  },
  async remove(kind: Kind, familyId: string, id: string) {
    await this.get(kind, familyId, id);
    return (modelFor(kind) as any).delete({ where: { id } });
  },
  async recordPayment(kind: Kind, familyId: string, id: string, input: { status: PaymentStatus; paidDate?: Date }) {
    await this.get(kind, familyId, id);
    return (modelFor(kind) as any).update({ where: { id }, data: { status: input.status, paidDate: input.status === PaymentStatus.WAIVED ? null : input.paidDate ?? new Date() } });
  },
};
