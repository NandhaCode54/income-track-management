export const MSG = {
  // Auth
  AUTH_REGISTER_SUCCESS: 'Registration successful. Please verify your email.',
  AUTH_LOGIN_SUCCESS: 'Login successful.',
  AUTH_LOGOUT_SUCCESS: 'Logged out successfully.',
  AUTH_TOKEN_REFRESHED: 'Token refreshed.',
  AUTH_EMAIL_VERIFIED: 'Email verified successfully.',
  AUTH_VERIFICATION_SENT: 'Verification email sent.',
  AUTH_RESET_EMAIL_SENT: 'Password reset email sent.',
  AUTH_PASSWORD_RESET: 'Password reset successfully.',
  AUTH_PASSWORD_CHANGED: 'Password changed successfully.',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password.',
  AUTH_EMAIL_NOT_VERIFIED: 'Please verify your email to continue.',
  AUTH_ACCOUNT_INACTIVE: 'Your account has been deactivated.',
  AUTH_TOKEN_INVALID: 'Invalid or expired token.',
  AUTH_UNAUTHORIZED: 'Unauthorized.',
  AUTH_FORBIDDEN: 'You do not have permission to perform this action.',

  // Family
  FAMILY_CREATED: 'Family workspace created.',
  FAMILY_UPDATED: 'Family updated.',
  FAMILY_NOT_FOUND: 'Family not found.',
  FAMILY_INVITE_SENT: 'Invitation sent successfully.',
  FAMILY_INVITE_ACCEPTED: 'Invitation accepted. Welcome to the family!',
  FAMILY_INVITE_INVALID: 'Invalid or expired invitation.',
  FAMILY_INVITE_REVOKED: 'Invitation revoked.',
  FAMILY_INVITE_RESENT: 'Invitation sent again.',
  FAMILY_MEMBER_REMOVED: 'Member removed from family.',
  FAMILY_ROLE_UPDATED: 'Member role updated.',
  FAMILY_ALREADY_MEMBER: 'That person is already a member of this family.',
  FAMILY_INVITE_EMAIL_MISMATCH: 'This invitation was sent to a different email address.',
  FAMILY_INVITE_ALREADY_ACCEPTED: 'This invitation has already been accepted.',
  FAMILY_SWITCHED: 'Workspace switched.',
  FAMILY_NOT_A_MEMBER: 'You are not a member of that family workspace.',
  FAMILY_SELF_ROLE_CHANGE: 'You cannot change your own role.',
  FAMILY_SELF_REMOVE: 'You cannot remove yourself from the family.',
  FAMILY_OWNER_PROTECTED: 'The workspace owner cannot be modified or removed.',
  FAMILY_ROLE_TOO_HIGH: 'You cannot assign a role equal to or above your own.',
  FAMILY_MEMBER_OUTRANKS: 'You cannot manage a member with an equal or higher role.',

  // Income
  INCOME_CREATED: 'Income added.',
  INCOME_UPDATED: 'Income updated.',
  INCOME_DELETED: 'Income deleted.',
  INCOME_NOT_YOURS: 'You can only change income entries you added.',
  INCOME_MEMBER_NOT_ALLOWED: 'You can only add income for yourself.',
  INCOME_MEMBER_INACTIVE: 'That member is no longer part of this family.',
  INCOME_FREQUENCY_REQUIRED: 'Choose how often this income repeats.',

  // Expense
  EXPENSE_CREATED: 'Expense added.',
  EXPENSE_UPDATED: 'Expense updated.',
  EXPENSE_DELETED: 'Expense deleted.',
  EXPENSE_NOT_YOURS: 'You can only change expenses you added.',
  EXPENSE_MEMBER_NOT_ALLOWED: 'You can only add expenses for yourself.',
  EXPENSE_MEMBER_INACTIVE: 'That member is no longer part of this family.',
  EXPENSE_FREQUENCY_REQUIRED: 'Choose how often this expense repeats.',
  EXPENSE_IMPORTED: 'Import finished.',
  EXPENSE_IMPORT_EMPTY: 'That file has no expense rows.',
  EXPENSE_IMPORT_TOO_LARGE: 'Import at most 1000 rows at a time.',
  EXPENSE_IMPORT_HEADERS: 'The file needs at least a Date, Description and Amount column.',

  // Expense categories
  CATEGORY_CREATED: 'Category created.',
  CATEGORY_UPDATED: 'Category updated.',
  CATEGORY_DELETED: 'Category deleted.',
  CATEGORY_DUPLICATE: 'A category with that name already exists here.',
  CATEGORY_PARENT_INVALID: 'Choose a top-level category as the parent.',
  CATEGORY_PARENT_SELF: 'A category cannot be its own parent.',
  CATEGORY_HAS_CHILDREN: 'Move or delete its subcategories first.',
  CATEGORY_NESTING_LIMIT: 'Categories can only be nested one level deep.',

  // Receipts
  RECEIPT_UPLOADED: 'Receipt uploaded.',
  RECEIPT_DELETED: 'Receipt deleted.',
  RECEIPT_LIMIT: 'An expense can hold at most 5 receipts.',

  // Budget
  BUDGET_CREATED: 'Budget set.',
  BUDGET_UPDATED: 'Budget updated.',
  BUDGET_DELETED: 'Budget removed.',
  BUDGET_DUPLICATE: 'A budget for that category already exists in this month.',
  BUDGET_OVERALL_DUPLICATE: 'An overall budget already exists for this month.',
  BUDGET_COPIED: 'Budgets copied.',
  BUDGET_COPY_SAME_PERIOD: 'Choose a different month to copy into.',
  BUDGET_COPY_EMPTY: 'That month has no budgets to copy.',

  // EMI
  EMI_CREATED: 'Loan added.',
  EMI_UPDATED: 'Loan updated.',
  EMI_DELETED: 'Loan removed.',
  EMI_PAYMENT_RECORDED: 'Payment recorded.',
  EMI_TERMS_LOCKED:
    'This loan already has payments against it, so its terms can no longer be changed. Delete it and add it again to correct them.',
  EMI_INSTALMENT_TOO_SMALL:
    'That instalment is smaller than the first month’s interest, so the loan would never be repaid.',
  EMI_INSTALMENT_NOT_FOUND: 'This loan has no instalment scheduled for that month.',
  EMI_INSTALMENT_SETTLED: 'That instalment is already settled.',

  // Generic CRUD
  CREATED: 'Created successfully.',
  UPDATED: 'Updated successfully.',
  DELETED: 'Deleted successfully.',
  FETCHED: 'Data fetched successfully.',
  NOT_FOUND: 'Not found.',

  // Errors
  INTERNAL_ERROR: 'Something went wrong. Please try again.',
  VALIDATION_ERROR: 'Validation failed.',
  DUPLICATE_EMAIL: 'An account with this email already exists.',
  RATE_LIMIT: 'Too many requests. Please slow down.',
} as const;
