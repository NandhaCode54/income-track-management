/** Local mirror of the server's Prisma `GoalType` enum. */
export const GOAL_TYPES = [
  'EMERGENCY_FUND',
  'CAR',
  'HOUSE',
  'VACATION',
  'WEDDING',
  'EDUCATION',
  'RETIREMENT',
  'CUSTOM',
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export interface GoalContribution {
  id: string;
  amount: number;
  note: string | null;
  date: string;
}

/** Mirrors the server DTO; progress is pre-clamped to 0–100 there. */
export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  savedAmount: number;
  progress: number;
  deadline: string | null;
  icon: string | null;
  color: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  notes: string | null;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalPayload {
  name: string;
  type: GoalType;
  targetAmount: number;
  deadline?: string;
  icon?: string;
  color?: string;
  notes?: string;
}

export interface ContributePayload {
  amount: number;
  date?: string;
  note?: string;
}

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  EMERGENCY_FUND: 'Emergency fund',
  CAR: 'Car',
  HOUSE: 'House',
  VACATION: 'Vacation',
  WEDDING: 'Wedding',
  EDUCATION: 'Education',
  RETIREMENT: 'Retirement',
  CUSTOM: 'Custom',
};
