export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  /** Invitation acceptance — reachable signed in or signed out. */
  JOIN_FAMILY: '/join/:token',

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
  LIABILITIES: '/liabilities',
  REPORTS: '/reports',
  NOTIFICATIONS: '/notifications',
  FAMILY: '/family',
  SETTINGS: '/settings',
  SUBSCRIPTION: '/subscription',

  // Admin
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_FAMILIES: '/admin/families',
  ADMIN_SUBSCRIPTIONS: '/admin/subscriptions',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_ANNOUNCEMENTS: '/admin/announcements',
} as const;
