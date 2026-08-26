import { api } from '@/services/api';
import { unwrap, type ApiEnvelope } from '@/types/api.types';
import type { FamilySettings, UpdateSettingsPayload } from './settings.types';

export const settingsApi = {
  async get(): Promise<FamilySettings> {
    const { data } = await api.get<ApiEnvelope<{ settings: FamilySettings }>>('/settings');
    return unwrap(data).settings;
  },

  async update(payload: UpdateSettingsPayload): Promise<FamilySettings> {
    const { data } = await api.patch<ApiEnvelope<{ settings: FamilySettings }>>('/settings', payload);
    return unwrap(data).settings;
  },
};
