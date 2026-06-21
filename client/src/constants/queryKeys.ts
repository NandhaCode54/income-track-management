export const QK = {
  // Auth
  ME: ['me'],

  // Family
  FAMILY: ['family'],
  FAMILY_MEMBERS: ['family', 'members'],

  // Income
  INCOME: ['income'],
  INCOME_SUMMARY: ['income', 'summary'],

  // Expense
  EXPENSES: ['expenses'],
  EXPENSE_CATEGORIES: ['expense-categories'],
  EXPENSE_SUMMARY: ['expenses', 'summary'],

  // Budget
  BUDGETS: ['budgets'],
  BUDGET_VS_ACTUAL: ['budgets', 'vs-actual'],

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
