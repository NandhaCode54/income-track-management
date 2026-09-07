import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type { PlanDefinition, PlanStatus, Subscription, UpgradePayload } from '@/types/subscription.types';

export const subscriptionApi = {
  async getCurrent(): Promise<Subscription> {
    const { data } = await api.get<ApiEnvelope<{ subscription: Subscription }>>('/subscriptions');
    return unwrap(data).subscription;
  },

  async getPlans(): Promise<PlanDefinition[]> {
    const { data } = await api.get<ApiEnvelope<{ plans: PlanDefinition[] }>>('/subscriptions/plans');
    return unwrap(data).plans;
  },

  async getPlanStatus(): Promise<PlanStatus> {
    const { data } = await api.get<ApiEnvelope<PlanStatus>>('/subscriptions/status');
    return unwrap(data);
  },

  async upgrade(payload: UpgradePayload): Promise<Subscription> {
    const { data } = await api.post<ApiEnvelope<{ subscription: Subscription }>>('/subscriptions/upgrade', payload);
    return unwrap(data).subscription;
  },

  /** Dev/demo only: the stand-in provider confirming the pending payment. */
  async demoPay(): Promise<Subscription> {
    const { data } = await api.post<ApiEnvelope<{ subscription: Subscription }>>('/subscriptions/demo-pay');
    return unwrap(data).subscription;
  },

  async cancel(): Promise<Subscription> {
    const { data } = await api.post<ApiEnvelope<{ subscription: Subscription }>>('/subscriptions/cancel');
    return unwrap(data).subscription;
  },

  async reactivate(): Promise<Subscription> {
    const { data } = await api.post<ApiEnvelope<{ subscription: Subscription }>>('/subscriptions/reactivate');
    return unwrap(data).subscription;
  },
};
