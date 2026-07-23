export const QK = {
  // Auth
  ME: ['me'],

  // Family
  FAMILY: ['family'],
  FAMILY_MEMBERS: ['family', 'members'],
  FAMILY_INVITES: ['family', 'invites'],
  MY_FAMILIES: ['families', 'mine'],
  INVITE_PREVIEW: (token: string) => ['invite-preview', token],

  // Income
  INCOME: ['income'],
  INCOME_LIST: (filters: unknown) => ['income', 'list', filters],
  INCOME_DETAIL: (id: string) => ['income', 'detail', id],
  INCOME_RECURRING: ['income', 'recurring'],
  INCOME_SUMMARY: (params: unknown) => ['income', 'summary', params],

  // Expense
  EXPENSES: ['expenses'],
  EXPENSE_LIST: (filters: unknown) => ['expenses', 'list', filters],
  EXPENSE_DETAIL: (id: string) => ['expenses', 'detail', id],
  EXPENSE_RECURRING: ['expenses', 'recurring'],
  EXPENSE_SUMMARY: (params: unknown) => ['expenses', 'summary', params],
  EXPENSE_CATEGORIES: ['expenses', 'categories'],

  // Budget
  BUDGETS: ['budgets'],
  BUDGET_LIST: (period: unknown) => ['budgets', 'list', period],
  BUDGET_VS_ACTUAL: (period: unknown) => ['budgets', 'vs-actual', period],

  // Goals
  GOALS: ['goals'],

  // EMI
  EMIS: ['emis'],
  EMI_PAYMENTS: (emiId: string) => ['emis', emiId, 'payments'],

  // Bills/Rent/Fees
  BILLS: ['bills'],
  RENT: ['rent'],
  SCHOOL_FEES: ['school-fees'],
  CHIT_FUNDS: ['chit-funds'],

  // Investments
  INVESTMENTS: ['investments'],
  ASSETS: ['assets'],
  LIABILITIES: ['liabilities'],

  // Dashboard
  DASHBOARD_SUMMARY: ['dashboard', 'summary'],
  DASHBOARD_UPCOMING: ['dashboard', 'upcoming'],
  DASHBOARD_CHARTS: ['dashboard', 'charts'],

  // Notifications
  NOTIFICATIONS: ['notifications'],
  UNREAD_COUNT: ['notifications', 'unread-count'],

  // Reports
  REPORTS_MONTHLY: ['reports', 'monthly'],
  REPORTS_YEARLY: ['reports', 'yearly'],

  // Admin
  ADMIN_USERS: ['admin', 'users'],
  ADMIN_FAMILIES: ['admin', 'families'],
  AUDIT_LOGS: ['audit-logs'],
} as const;
