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
  EMI_LIST: (filters: unknown) => ['emis', 'list', filters],
  EMI_DETAIL: (id: string) => ['emis', 'detail', id],
  EMI_UPCOMING: (days: unknown) => ['emis', 'upcoming', days],
  EMI_PAYMENTS: (emiId: string) => ['emis', emiId, 'payments'],
  /** The calculator touches no stored data, so its key is the inputs alone. */
  EMI_CALCULATOR: (input: unknown) => ['emis', 'calculator', input],

  // Bills/Rent/Fees
  BILLS: ['bills'],
  RENT: ['rent'],
  SCHOOL_FEES: ['school-fees'],
  CHIT_FUNDS: ['chit-funds'],

  // Investments
  INVESTMENTS: ['investments'],
  ASSETS: ['assets'],
  LIABILITIES: ['liabilities'],
  /** Cross-ledger figure; its own namespace because it reads all three ledgers. */
  PORTFOLIO_NET_WORTH: ['portfolio', 'net-worth'],

  /**
   * Dashboard. `DASHBOARD` is the prefix every finance write invalidates — the
   * page reads across income, expenses and budgets, so any of them moving it.
   */
  DASHBOARD: ['dashboard'],
  DASHBOARD_SUMMARY: (period: unknown) => ['dashboard', 'summary', period],
  DASHBOARD_UPCOMING: (days: unknown) => ['dashboard', 'upcoming', days],
  DASHBOARD_CHARTS: (period: unknown) => ['dashboard', 'charts', period],
  DASHBOARD_TOP_EXPENSES: (period: unknown) => ['dashboard', 'top-expenses', period],
  DASHBOARD_CONTRIBUTION: (period: unknown) => ['dashboard', 'contribution', period],

  // Notifications
  NOTIFICATIONS: ['notifications'],
  UNREAD_COUNT: ['notifications', 'unread-count'],

  // Reports
  REPORTS: ['reports'],
  REPORTS_MONTHLY: ['reports', 'monthly'],
  REPORTS_YEARLY: ['reports', 'yearly'],

  // Insights
  INSIGHTS: ['insights'],

  // Subscription
  SUBSCRIPTION: ['subscription'],
  SUBSCRIPTION_PLANS: ['subscription', 'plans'],
  SUBSCRIPTION_STATUS: ['subscription', 'status'],

  // Admin
  ADMIN_USERS: ['admin', 'users'],
  ADMIN_USER_DETAIL: (id: string) => ['admin', 'users', id],
  ADMIN_FAMILIES: ['admin', 'families'],
  ADMIN_FAMILY_DETAIL: (id: string) => ['admin', 'families', id],
  ADMIN_SUBSCRIPTIONS: ['admin', 'subscriptions'],
  ADMIN_AUDIT_LOGS: ['admin', 'audit-logs'],
  ADMIN_ANALYTICS: ['admin', 'analytics'],
  ADMIN_ANNOUNCEMENTS: ['admin', 'announcements'],
} as const;
