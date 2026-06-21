import crypto from 'crypto';

export const generateSecureToken = (bytes = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export const generateFamilyCode = (): string => {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
};
