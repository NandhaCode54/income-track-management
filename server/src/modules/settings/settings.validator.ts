import { z } from 'zod';
import {
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  LANGUAGE_OPTIONS,
  DATE_FORMAT_OPTIONS,
} from './settings.types';

const currencyCodes = CURRENCY_OPTIONS.map((c) => c.code) as [string, ...string[]];
const timezones = TIMEZONE_OPTIONS as unknown as [string, ...string[]];
const languages = LANGUAGE_OPTIONS.map((l) => l.code) as [string, ...string[]];
const dateFormats = DATE_FORMAT_OPTIONS as unknown as [string, ...string[]];

export const updateSettingsSchema = z.object({
  currency: z.enum(currencyCodes).optional(),
  currencySymbol: z.string().trim().max(5).optional(),
  timezone: z.enum(timezones).optional(),
  language: z.enum(languages).optional(),
  dateFormat: z.enum(dateFormats).optional(),
  financialYearStart: z.number().int().min(1).max(12).optional(),
  emailReminders: z.boolean().optional(),
  pushReminders: z.boolean().optional(),
  reminderDaysBefore: z.number().int().min(0).max(30).optional(),
});
