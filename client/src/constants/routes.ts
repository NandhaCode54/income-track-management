export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // App
  DASHBOARD: '/',
  INCOME: '/income',
  EXPENSES: '/expenses',
  BUDGET: '/budget',
  GOALS: '/goals',
  EMI: '/emi',
  BILLS: '/bills',
  RENT: '/rent',
  SCHOOL_FEES: '/school-fees',
  CHIT_FUND: '/chit-fund',
  INVESTMENTS: '/investments',
  ASSETS: '/assets',
  REPORTS: '/reports',
  NOTIFICATIONS: '/notifications',
  FAMILY: '/family',
  SETTINGS: '/settings',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_FAMILIES: '/admin/families',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
} as const;
