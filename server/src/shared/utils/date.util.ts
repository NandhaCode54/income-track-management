export const startOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const endOfMonth = (date: Date = new Date()): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
};

export const startOfYear = (year: number = new Date().getFullYear()): Date => {
  return new Date(year, 0, 1);
};

export const endOfYear = (year: number = new Date().getFullYear()): Date => {
  return new Date(year, 11, 31, 23, 59, 59, 999);
};

export const addHours = (date: Date, hours: number): Date => {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
};

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const isExpired = (date: Date): boolean => date < new Date();

export const formatDate = (date: Date): string => date.toISOString().split('T')[0];
