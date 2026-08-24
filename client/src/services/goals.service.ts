import { api } from './api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type { ContributePayload, Goal, GoalPayload } from '@/types/goals.types';

export const goalsApi = {
  async list(): Promise<Goal[]> {
    const { data } = await api.get<ApiEnvelope<{ goals: Goal[] }>>('/goals');
    return unwrap(data).goals;
  },

  async create(payload: GoalPayload): Promise<Goal> {
    const { data } = await api.post<ApiEnvelope<{ goal: Goal }>>('/goals', payload);
    return unwrap(data).goal;
  },

  async update(id: string, payload: Partial<GoalPayload>): Promise<Goal> {
    const { data } = await api.patch<ApiEnvelope<{ goal: Goal }>>(`/goals/${id}`, payload);
    return unwrap(data).goal;
  },

  async contribute(id: string, payload: ContributePayload): Promise<Goal> {
    const { data } = await api.post<ApiEnvelope<{ goal: Goal }>>(
      `/goals/${id}/contributions`,
      payload,
    );
    return unwrap(data).goal;
  },

  async remove(id: string): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<never>>(`/goals/${id}`);
    return data.message;
  },
};
