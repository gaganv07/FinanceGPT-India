import {
  SimpleInterestResult,
  CompoundInterestResult,
  EmiResult,
  BudgetResult,
  SavingsRateResult,
  InflationResult
} from "./types";

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function calculateSimpleInterest(
  principal: number,
  annualRatePct: number,
  timeYears: number
): SimpleInterestResult {
  if (principal <= 0 || annualRatePct < 0 || timeYears <= 0) {
    return {
      success: false,
      error: "Principal and time must be positive numbers, and rate must be non-negative."
    };
  }

  const interest = (principal * annualRatePct * timeYears) / 100.0;
  const totalAmount = principal + interest;

  return {
    success: true,
    calculator: "Simple Interest",
    principal: round2(principal),
    annual_rate_pct: round2(annualRatePct),
    time_years: round2(timeYears),
    interest_earned: round2(interest),
    total_amount: round2(totalAmount),
    formula: "SI = (Principal × Rate × Time) / 100",
    steps: [
      `1. Principal (P): ₹${principal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `2. Annual Rate (R): ${annualRatePct}%`,
      `3. Duration (T): ${timeYears} years`,
      `4. Interest: (${principal.toLocaleString("en-IN")} × ${annualRatePct} × ${timeYears}) / 100 = ₹${interest.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `5. Total Amount: ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    ],
    disclaimer: "Hypothetical illustration. Actual bank deposit returns may vary according to compounding frequency and TDS."
  };
}

export function calculateCompoundInterest(
  principal: number,
  annualRatePct: number,
  timeYears: number,
  compoundingFrequency: number = 1
): CompoundInterestResult {
  if (principal <= 0 || annualRatePct < 0 || timeYears <= 0 || compoundingFrequency <= 0) {
    return {
      success: false,
      error: "Principal, duration, and compounding frequency must be positive. Rate cannot be negative."
    };
  }

  const r = annualRatePct / 100.0 / compoundingFrequency;
  const nT = compoundingFrequency * timeYears;
  const totalAmount = principal * Math.pow(1.0 + r, nT);
  const interestEarned = totalAmount - principal;

  const freqNames: Record<number, string> = {
    1: "Annually (1x/year)",
    2: "Semi-Annually (2x/year)",
    4: "Quarterly (4x/year)",
    12: "Monthly (12x/year)"
  };
  const freqLabel = freqNames[compoundingFrequency] || `${compoundingFrequency} times per year`;

  return {
    success: true,
    calculator: "Compound Interest",
    principal: round2(principal),
    annual_rate_pct: round2(annualRatePct),
    time_years: round2(timeYears),
    compounding_frequency: freqLabel,
    interest_earned: round2(interestEarned),
    total_amount: round2(totalAmount),
    formula: "A = P × (1 + R/(100×n))^(n×t)",
    steps: [
      `1. Initial Principal (P): ₹${principal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `2. Compounding Frequency: ${freqLabel}`,
      `3. Periodic Rate (r): ${(r * 100).toFixed(4)}%`,
      `4. Total Compounding Periods: ${nT}`,
      `5. Final Maturity Amount (A): ₹${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `6. Total Compound Interest Earned: ₹${interestEarned.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    ],
    disclaimer: "Educational simulation. Mutual fund or market investments are subject to market volatility and do not yield fixed compounded rates."
  };
}

export function calculateEmi(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): EmiResult {
  if (principal <= 0 || tenureMonths <= 0 || annualRatePct < 0) {
    return {
      success: false,
      error: "Principal and tenure must be positive numbers. Rate cannot be negative."
    };
  }

  let emi = 0;
  let totalPayment = 0;
  let totalInterest = 0;

  if (annualRatePct === 0) {
    emi = principal / tenureMonths;
    totalPayment = principal;
    totalInterest = 0;
  } else {
    const monthlyRate = annualRatePct / 100.0 / 12.0;
    const powTerm = Math.pow(1.0 + monthlyRate, tenureMonths);
    emi = (principal * monthlyRate * powTerm) / (powTerm - 1.0);
    totalPayment = emi * tenureMonths;
    totalInterest = totalPayment - principal;
  }

  const interestRatio = principal > 0 ? (totalInterest / principal) * 100.0 : 0.0;

  return {
    success: true,
    calculator: "Loan EMI & Repayment",
    loan_principal: round2(principal),
    annual_interest_rate_pct: round2(annualRatePct),
    tenure_months: tenureMonths,
    tenure_years: round2(tenureMonths / 12.0),
    monthly_emi: round2(emi),
    total_interest_payable: round2(totalInterest),
    total_amount_payable: round2(totalPayment),
    interest_to_principal_ratio_pct: round2(interestRatio),
    formula: "EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]",
    steps: [
      `1. Loan Principal (P): ₹${principal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `2. Monthly Interest Rate (r): ${(annualRatePct / 12.0).toFixed(4)}%`,
      `3. Total Number of EMIs (n): ${tenureMonths} months`,
      `4. Monthly EMI: ₹${emi.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `5. Total Repayment: ₹${totalPayment.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      `6. Total Interest Cost: ₹${totalInterest.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${interestRatio.toFixed(1)}% of principal)`
    ],
    disclaimer: "Standard reducing-balance amortization. Processing fees, insurance, and bank levies are excluded."
  };
}

export function calculateBudget503020(monthlyIncome: number): BudgetResult {
  if (monthlyIncome <= 0) {
    return {
      success: false,
      error: "Monthly income must be greater than zero."
    };
  }

  const needs = monthlyIncome * 0.5;
  const wants = monthlyIncome * 0.3;
  const savings = monthlyIncome * 0.2;

  return {
    success: true,
    calculator: "50/30/20 Monthly Budget Split",
    monthly_income: round2(monthlyIncome),
    needs_50: {
      amount: round2(needs),
      percentage: 50,
      description: "Essential Living (Rent, groceries, utilities, EMIs, health coverage)"
    },
    wants_30: {
      amount: round2(wants),
      percentage: 30,
      description: "Lifestyle & Discretionary (Dining out, entertainment, subscriptions, hobbies)"
    },
    savings_20: {
      amount: round2(savings),
      percentage: 20,
      description: "Future Security & Investments (Emergency buffer, Mutual Fund SIPs, PPF/NPS)"
    },
    guidance: "The 50/30/20 rule is an educational benchmark. Individuals in high-cost metro cities or with heavy obligations may adjust to 60/20/20 as necessary."
  };
}

export function calculateSavingsRate(
  monthlyIncome: number,
  monthlySavings: number
): SavingsRateResult {
  if (monthlyIncome <= 0) {
    return {
      success: false,
      error: "Monthly income must be greater than zero."
    };
  }
  if (monthlySavings < 0) {
    return {
      success: false,
      error: "Monthly savings cannot be negative."
    };
  }
  if (monthlySavings > monthlyIncome) {
    return {
      success: false,
      error: "Monthly savings cannot exceed total monthly income."
    };
  }

  const rate = (monthlySavings / monthlyIncome) * 100.0;
  let verdict = "";
  if (rate < 10.0) {
    verdict = "Low (Aim to review non-essential expenses to build a 3-6 month emergency cushion).";
  } else if (rate < 20.0) {
    verdict = "Fair (Decent baseline; try gradually stepping up savings via automated monthly SIPs).";
  } else if (rate < 35.0) {
    verdict = "Strong (Well above average; provides healthy buffer for wealth creation and goals).";
  } else {
    verdict = "Exceptional (Excellent discipline; ensure investments are diversified across asset classes).";
  }

  return {
    success: true,
    calculator: "Personal Savings Rate",
    monthly_income: round2(monthlyIncome),
    monthly_savings: round2(monthlySavings),
    savings_rate_pct: round2(rate),
    health_rating: verdict,
    formula: "(Monthly Savings / Monthly Income) × 100"
  };
}

export function calculateInflationImpact(
  presentAmount: number,
  annualInflationPct: number,
  years: number
): InflationResult {
  if (presentAmount <= 0 || annualInflationPct < 0 || years <= 0) {
    return {
      success: false,
      error: "Present amount and years must be positive. Inflation cannot be negative."
    };
  }

  const i = annualInflationPct / 100.0;
  const futureCost = presentAmount * Math.pow(1.0 + i, years);
  const retainedValue = presentAmount / Math.pow(1.0 + i, years);
  const purchasingPowerPct = (retainedValue / presentAmount) * 100.0;

  return {
    success: true,
    calculator: "Inflation & Purchasing Power",
    present_amount: round2(presentAmount),
    annual_inflation_pct: round2(annualInflationPct),
    years,
    future_cost_of_basket: round2(futureCost),
    retained_purchasing_power: round2(retainedValue),
    purchasing_power_loss_pct: round2(100.0 - purchasingPowerPct),
    explanation:
      `At ${annualInflationPct}% annual inflation, a basket of goods that costs ₹${presentAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} today ` +
      `will cost ₹${futureCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })} in ${years} years. Holding ₹${presentAmount.toLocaleString("en-IN")} in non-earning cash ` +
      `will retain only ₹${retainedValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${purchasingPowerPct.toFixed(1)}%) of real purchasing value.`,
    disclaimer: "Inflation rates fluctuate based on RBI monetary policies, commodity cycles, and NSO CPI releases."
  };
}
