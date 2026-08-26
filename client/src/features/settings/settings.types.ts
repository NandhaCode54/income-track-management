export interface FamilySettings {
  id: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  language: string;
  dateFormat: string;
  financialYearStart: number;
  emailReminders: boolean;
  pushReminders: boolean;
  reminderDaysBefore: number;
  updatedAt: string;
}

export interface UpdateSettingsPayload {
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  language?: string;
  dateFormat?: string;
  financialYearStart?: number;
  emailReminders?: boolean;
  pushReminders?: boolean;
  reminderDaysBefore?: number;
}

export const CURRENCY_OPTIONS = [
  { code: 'INR', symbol: '\u20B9', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', label: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', label: 'British Pound' },
  { code: 'AED', symbol: 'AED', label: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', label: 'Saudi Riyal' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
] as const;

export const TIMEZONE_OPTIONS = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
] as const;

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
] as const;

export const DATE_FORMAT_OPTIONS = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
  'DD.MM.YYYY',
  'DD-MMM-YYYY',
] as const;
