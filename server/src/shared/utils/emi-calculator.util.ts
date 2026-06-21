export interface EMIResult {
  monthlyEMI: number;
  totalAmount: number;
  totalInterest: number;
  schedule: EMIScheduleEntry[];
}

export interface EMIScheduleEntry {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

export const calculateEMI = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
): EMIResult => {
  const monthlyRate = annualRate / 12 / 100;

  let monthlyEMI: number;
  if (monthlyRate === 0) {
    monthlyEMI = principal / tenureMonths;
  } else {
    monthlyEMI =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  const schedule: EMIScheduleEntry[] = [];
  let balance = principal;

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyEMI - interest;
    balance = Math.max(0, balance - principalPaid);

    schedule.push({
      month,
      emi: Math.round(monthlyEMI * 100) / 100,
      principal: Math.round(principalPaid * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.round(balance * 100) / 100,
    });
  }

  const totalAmount = monthlyEMI * tenureMonths;
  return {
    monthlyEMI: Math.round(monthlyEMI * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    totalInterest: Math.round((totalAmount - principal) * 100) / 100,
    schedule,
  };
};
