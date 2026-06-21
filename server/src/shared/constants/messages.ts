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
  FAMILY_MEMBER_REMOVED: 'Member removed from family.',
  FAMILY_ROLE_UPDATED: 'Member role updated.',

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
