/**
 * Loan maths: the instalment, and the schedule that instalment implies.
 *
 * Pure functions — no Prisma, no `Decimal`, no family. That is deliberate: the
 * `/emi/calculator` endpoint and the schedule written when a loan is created call
 * the same code, so a figure someone tries in the calculator is exactly the
 * figure that gets stored if they go ahead.
 *
 * **Why plain `number` here when every other money path uses `Decimal`.**
 * `Decimal` is for *accumulating* stored amounts, where a paisa of drift per row
 * compounds across a ledger. This is a closed-form computation over three inputs,
 * rounded to two places immediately, with the amortisation loop re-rounding at
 * every step rather than carrying error forward. A double holds every
 * two-decimal value in this range exactly — and `Math.pow` on a `Decimal` does
 * not exist anyway.
 */

/** 40 years. Longer than any real mortgage, short enough that a schedule stays a sane payload. */
export const MAX_TENURE_MONTHS = 480;

export interface LoanTerms {
  /** The amount borrowed. */
  principal: number;
  /** Annual nominal rate as a percentage — `8.5`, not `0.085`. */
  annualRate: number;
  tenureMonths: number;
}

export interface AmortisationRow {
  /** 1-based instalment number. */
  installment: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface LoanBreakdown {
  monthlyEMI: number;
  totalPayable: number;
  totalInterest: number;
  schedule: AmortisationRow[];
}

const round2 = (value: number): number => Math.round(value * 100) / 100;

/** The monthly rate as a fraction. `8.5` a year → `0.00708…` a month. */
const monthlyRateOf = (annualRate: number): number => annualRate / 12 / 100;

/**
 * The standard reducing-balance instalment:
 *
 * ```
 *        P · r · (1 + r)ⁿ
 *   E = ──────────────────
 *         (1 + r)ⁿ − 1
 * ```
 *
 * **The zero-rate branch is not defensive padding.** At `r = 0` the expression is
 * `0 / 0`. An interest-free loan — a no-cost EMI, money borrowed from family, a
 * staff advance — is a real and common thing to record, and without the guard the
 * function returns `NaN`, which propagates silently into a stored `Decimal` and
 * finally fails at the database rather than at the input.
 */
export const monthlyEmiFor = ({ principal, annualRate, tenureMonths }: LoanTerms): number => {
  if (tenureMonths <= 0) return 0;

  const rate = monthlyRateOf(annualRate);
  if (rate === 0) return round2(principal / tenureMonths);

  const growth = Math.pow(1 + rate, tenureMonths);
  return round2((principal * rate * growth) / (growth - 1));
};

/**
 * The instalment-by-instalment split of interest and principal.
 *
 * Interest is charged on the **outstanding** balance, which is the entire point
 * of laying the rows out: an early instalment on a long loan is mostly interest,
 * and a borrower who thinks a part-payment in year two saves the same as one in
 * year nine is reading the total instead of the schedule.
 *
 * @param monthlyEMI Overrides the computed instalment — pass the lender's stated
 *   figure when there is one. Banks round their own way, and the number on the
 *   statement is what actually leaves the account.
 */
export const amortise = (terms: LoanTerms, monthlyEMI?: number): LoanBreakdown => {
  const payment = monthlyEMI ?? monthlyEmiFor(terms);
  const rate = monthlyRateOf(terms.annualRate);
  const schedule: AmortisationRow[] = [];

  let balance = round2(terms.principal);

  for (let installment = 1; installment <= terms.tenureMonths; installment += 1) {
    const openingBalance = balance;
    const interest = round2(openingBalance * rate);

    /*
     * The last instalment is derived backwards from the balance, not forwards
     * from the payment.
     *
     * Rounding each instalment to the paisa leaves a residue, and over 240 months
     * it is routinely tens of rupees. Carrying it forward ends the loan either
     * still owing money or owing a negative amount — the previous version hid
     * that with `Math.max(0, …)`, which makes the balance *look* right while the
     * instalments no longer add up to it. Lenders resolve it the honest way: the
     * final instalment is whatever clears the balance and differs slightly from
     * every one before it. That is why `payment` is a per-row field rather than a
     * single number on the breakdown.
     */
    const isLast = installment === terms.tenureMonths;
    const principalPart = isLast ? openingBalance : round2(payment - interest);
    const actualPayment = isLast ? round2(openingBalance + interest) : payment;

    balance = round2(openingBalance - principalPart);

    schedule.push({
      installment,
      openingBalance,
      payment: actualPayment,
      interest,
      principal: principalPart,
      closingBalance: balance,
    });

    /*
     * A payment smaller than the interest it accrues never reduces the balance —
     * the loan grows forever and the loop would run the full tenure emitting
     * nonsense. Someone really does type a ₹500 EMI against a ₹10,00,000 loan, so
     * stop; `isUnviableInstalment` rejects it before it can ever be stored.
     */
    if (balance >= openingBalance && !isLast) break;
  }

  const totalPayable = round2(schedule.reduce((sum, row) => sum + row.payment, 0));
  const totalInterest = round2(schedule.reduce((sum, row) => sum + row.interest, 0));

  return { monthlyEMI: payment, totalPayable, totalInterest, schedule };
};

/**
 * True when an instalment is too small to ever clear the loan — the first
 * month's interest already meets or exceeds it.
 *
 * Tested at the first instalment because that is where interest is highest: a
 * payment that covers month one's interest covers every later month's too, since
 * the balance only falls from there.
 */
export const isUnviableInstalment = (terms: LoanTerms, monthlyEMI: number): boolean => {
  const firstInterest = round2(terms.principal * monthlyRateOf(terms.annualRate));
  return monthlyEMI <= firstInterest;
};
