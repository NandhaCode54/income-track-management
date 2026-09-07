import { AppError } from './AppError';

/**
 * The plan's paid-feature gate. 402 with an `UPGRADE_REQUIRED` code tells the
 * client the call is well-formed but the family's current plan does not include
 * this feature — try again after a verified upgrade.
 */
export class PaymentRequiredError extends AppError {
  constructor(message = 'This feature requires a paid plan.') {
    super(message, 402, 'UPGRADE_REQUIRED');
  }
}