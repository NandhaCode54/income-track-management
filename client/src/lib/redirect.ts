/**
 * Sanitises a `?redirect=` value before navigating to it.
 * Only same-origin, single-slash paths are allowed — this blocks open redirects
 * such as `?redirect=//evil.com` or `?redirect=https://evil.com`.
 */
export const safeRedirect = (value: string | null, fallback: string): string => {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
};
