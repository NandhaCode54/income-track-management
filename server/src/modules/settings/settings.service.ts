import { settingsRepository } from './settings.repository';
import type { SettingsDto, UpdateSettingsInput } from './settings.types';
import { NotFoundError } from '../../shared/errors/NotFoundError';

const toDto = (row: NonNullable<Awaited<ReturnType<typeof settingsRepository.find>>>): SettingsDto => row;

export const settingsService = {
  async get(familyId: string): Promise<SettingsDto> {
    const settings = await settingsRepository.find(familyId);
    if (!settings) throw new NotFoundError('Settings');
    return toDto(settings);
  },

  async update(familyId: string, input: UpdateSettingsInput): Promise<SettingsDto> {
    const settings = await settingsRepository.find(familyId);
    if (!settings) throw new NotFoundError('Settings');

    const updated = await settingsRepository.update(familyId, input);
    return toDto(updated);
  },
};
