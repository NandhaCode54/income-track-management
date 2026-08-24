import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import {
  PORTFOLIO_PATH,
  type Asset,
  type Investment,
  type Liability,
  type NetWorth,
  type PortfolioKind,
} from '@/types/portfolio.types';

export interface InvestmentPayload {
  type: Investment['type'];
  name: string;
  investedAmount: number;
  currentValue: number;
  units?: number;
  purchaseDate: string;
  notes?: string;
}

export interface AssetPayload {
  type: Asset['type'];
  name: string;
  value: number;
  purchaseValue?: number;
  purchaseDate?: string;
  description?: string;
}

export interface LiabilityPayload {
  type: Liability['type'];
  name: string;
  amount: number;
  interestRate?: number;
  dueDate?: string;
  description?: string;
}

export type PortfolioPayload = InvestmentPayload | AssetPayload | LiabilityPayload;

const pathOf = (kind: PortfolioKind) => `/${PORTFOLIO_PATH[kind]}`;

/** These ledgers are small; the server returns plain lists without pagination. */
export const portfolioApi = {
  async list(kind: PortfolioKind): Promise<(Investment | Asset | Liability)[]> {
    const { data } = await api.get<ApiEnvelope<{ items: (Investment | Asset | Liability)[] }>>(
      pathOf(kind),
    );
    return unwrap(data).items;
  },

  async create(kind: PortfolioKind, payload: PortfolioPayload): Promise<Investment | Asset | Liability> {
    const { data } = await api.post<ApiEnvelope<{ item: Investment | Asset | Liability }>>(
      pathOf(kind),
      payload,
    );
    return unwrap(data).item;
  },

  async update(
    kind: PortfolioKind,
    id: string,
    payload: Partial<PortfolioPayload>,
  ): Promise<Investment | Asset | Liability> {
    const { data } = await api.patch<ApiEnvelope<{ item: Investment | Asset | Liability }>>(
      `${pathOf(kind)}/${id}`,
      payload,
    );
    return unwrap(data).item;
  },

  async remove(kind: PortfolioKind, id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`${pathOf(kind)}/${id}`);
    return data.message;
  },

  /** Cross-ledger figure — investments + assets − liabilities. */
  async netWorth(): Promise<NetWorth> {
    const { data } = await api.get<ApiEnvelope<{ netWorth: NetWorth }>>('/portfolio/net-worth');
    return unwrap(data).netWorth;
  },
};
