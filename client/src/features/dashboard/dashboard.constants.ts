import { Calendar, GraduationCap, Home, Receipt } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import type { ObligationKind } from '@/types/dashboard.types';

/**
 * How each kind of obligation is presented in the upcoming-payments feed. The
 * icon and the word are what identify a row — the feed mixes four sources, and
 * nothing there is distinguished by colour alone.
 */
export const OBLIGATION_META: Record<
  ObligationKind,
  { label: string; icon: typeof Calendar; to: string }
> = {
  EMI: { label: 'EMI', icon: Calendar, to: ROUTES.EMI },
  BILL: { label: 'Bill', icon: Receipt, to: ROUTES.BILLS },
  RENT: { label: 'Rent', icon: Home, to: ROUTES.RENT },
  SCHOOL_FEE: { label: 'School fee', icon: GraduationCap, to: ROUTES.SCHOOL_FEES },
};

/** How far ahead the feed looks. Matches the server's own default. */
export const UPCOMING_WINDOW_DAYS = 30;

/** Rows shown before the card defers to the module's own page. */
export const UPCOMING_PREVIEW_ROWS = 6;
