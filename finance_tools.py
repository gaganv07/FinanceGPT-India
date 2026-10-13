"""
finance_tools.py
================
FinanceGPT India — Deterministic Financial Calculators
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University

Transparent, mathematical calculations for:
1. Simple Interest
2. Compound Interest
3. Loan EMI & Total Repayment
4. Monthly Budget Breakdown (50/30/20 Rule)
5. Savings Rate
6. Inflation-Adjusted Purchasing Power

All calculations validate inputs, handle edge cases, and return step-by-step details.
"""

from typing import Dict, Any, Union


def calculate_simple_interest(principal: float, annual_rate_pct: float, time_years: float) -> Dict[str, Any]:
    """
    Calculate Simple Interest (SI).
    Formula: SI = (P * R * T) / 100
    Total Amount = P + SI
    """
    if principal <= 0 or annual_rate_pct < 0 or time_years <= 0:
        return {
            "success": False,
            "error": "Principal and time must be positive numbers, and rate must be non-negative."
        }

    interest = (principal * annual_rate_pct * time_years) / 100.0
    total_amount = principal + interest

    return {
        "success": True,
        "calculator": "Simple Interest",
        "principal": round(principal, 2),
        "annual_rate_pct": round(annual_rate_pct, 2),
        "time_years": round(time_years, 2),
        "interest_earned": round(interest, 2),
        "total_amount": round(total_amount, 2),
        "formula": "SI = (Principal × Rate × Time) / 100",
        "steps": [
            f"1. Principal (P): ₹{principal:,.2f}",
            f"2. Annual Rate (R): {annual_rate_pct}%",
            f"3. Duration (T): {time_years} years",
            f"4. Interest: ({principal:,.2f} × {annual_rate_pct} × {time_years}) / 100 = ₹{interest:,.2f}",
            f"5. Total Amount: ₹{principal:,.2f} + ₹{interest:,.2f} = ₹{total_amount:,.2f}"
        ],
        "disclaimer": "Hypothetical illustration. Actual bank deposit returns may vary according to compounding frequency and TDS."
    }


def calculate_compound_interest(
    principal: float,
    annual_rate_pct: float,
    time_years: float,
    compounding_frequency: int = 1
) -> Dict[str, Any]:
    """
    Calculate Compound Interest (CI).
    Formula: A = P * (1 + r/n)**(n*t)
    CI = A - P
    Frequency: 1 = Annually, 2 = Semi-Annually, 4 = Quarterly, 12 = Monthly
    """
    if principal <= 0 or annual_rate_pct < 0 or time_years <= 0 or compounding_frequency <= 0:
        return {
            "success": False,
            "error": "Principal, duration, and compounding frequency must be positive. Rate cannot be negative."
        }

    r = (annual_rate_pct / 100.0) / compounding_frequency
    n_t = compounding_frequency * time_years
    total_amount = principal * ((1.0 + r) ** n_t)
    interest_earned = total_amount - principal

    freq_names = {
        1: "Annually (1x/year)",
        2: "Semi-Annually (2x/year)",
        4: "Quarterly (4x/year)",
        12: "Monthly (12x/year)"
    }
    freq_label = freq_names.get(compounding_frequency, f"{compounding_frequency} times per year")

    return {
        "success": True,
        "calculator": "Compound Interest",
        "principal": round(principal, 2),
        "annual_rate_pct": round(annual_rate_pct, 2),
        "time_years": round(time_years, 2),
        "compounding_frequency": freq_label,
        "interest_earned": round(interest_earned, 2),
        "total_amount": round(total_amount, 2),
        "formula": "A = P × (1 + R/(100×n))^(n×t)",
        "steps": [
            f"1. Initial Principal (P): ₹{principal:,.2f}",
            f"2. Compounding Frequency: {freq_label}",
            f"3. Periodic Rate (r): {annual_rate_pct}% / {compounding_frequency} = {r*100:.4f}%",
            f"4. Total Compounding Periods: {compounding_frequency} × {time_years} = {n_t:.1f}",
            f"5. Final Maturity Amount (A): ₹{total_amount:,.2f}",
            f"6. Total Compound Interest Earned: ₹{interest_earned:,.2f}"
        ],
        "disclaimer": "Educational simulation. Mutual fund or market investments are subject to market volatility and do not yield fixed compounded rates."
    }


def calculate_emi(principal: float, annual_rate_pct: float, tenure_months: int) -> Dict[str, Any]:
    """
    Calculate Equated Monthly Installment (EMI).
    Formula: EMI = [P * r * (1 + r)^n] / [(1 + r)^n - 1]
    Where r = annual_rate / (12 * 100), n = tenure in months.
    """
    if principal <= 0 or tenure_months <= 0 or annual_rate_pct < 0:
        return {
            "success": False,
            "error": "Principal and tenure must be positive numbers. Rate cannot be negative."
        }

    # Special case: 0% interest loan
    if annual_rate_pct == 0:
        emi = principal / tenure_months
        total_payment = principal
        total_interest = 0.0
    else:
        monthly_rate = (annual_rate_pct / 100.0) / 12.0
        pow_term = (1.0 + monthly_rate) ** tenure_months
        emi = (principal * monthly_rate * pow_term) / (pow_term - 1.0)
        total_payment = emi * tenure_months
        total_interest = total_payment - principal

    interest_ratio = (total_interest / principal) * 100.0 if principal > 0 else 0.0

    return {
        "success": True,
        "calculator": "Loan EMI & Repayment",
        "loan_principal": round(principal, 2),
        "annual_interest_rate_pct": round(annual_rate_pct, 2),
        "tenure_months": tenure_months,
        "tenure_years": round(tenure_months / 12.0, 1),
        "monthly_emi": round(emi, 2),
        "total_interest_payable": round(total_interest, 2),
        "total_amount_payable": round(total_payment, 2),
        "interest_to_principal_ratio_pct": round(interest_ratio, 1),
        "formula": "EMI = [P × r × (1+r)^n] / [(1+r)^n - 1]",
        "steps": [
            f"1. Loan Principal (P): ₹{principal:,.2f}",
            f"2. Monthly Interest Rate (r): {annual_rate_pct}% / 12 = {(annual_rate_pct/12):.4f}%",
            f"3. Total Number of EMIs (n): {tenure_months} months",
            f"4. Monthly EMI: ₹{emi:,.2f}",
            f"5. Total Repayment (EMI × {tenure_months}): ₹{total_payment:,.2f}",
            f"6. Total Interest Cost: ₹{total_interest:,.2f} ({interest_ratio:.1f}% of principal)"
        ],
        "disclaimer": "Standard reducing-balance amortization. Processing fees, insurance, and bank levies are excluded."
    }


def calculate_budget_50_30_20(monthly_income: float) -> Dict[str, Any]:
    """
    Calculate recommended monthly budget breakdown according to the 50/30/20 guideline:
    - 50% Needs: Housing, groceries, utilities, minimum loan payments, basic healthcare
    - 30% Wants: Dining, entertainment, travel, shopping, hobby subscriptions
    - 20% Savings & Debt: Emergency fund, SIPs, retirement deposits, accelerated debt payoff
    """
    if monthly_income <= 0:
        return {
            "success": False,
            "error": "Monthly income must be greater than zero."
        }

    needs = monthly_income * 0.50
    wants = monthly_income * 0.30
    savings = monthly_income * 0.20

    return {
        "success": True,
        "calculator": "50/30/20 Monthly Budget Split",
        "monthly_income": round(monthly_income, 2),
        "needs_50": {
            "amount": round(needs, 2),
            "percentage": 50,
            "description": "Essential Living (Rent, groceries, utilities, EMIs, health coverage)"
        },
        "wants_30": {
            "amount": round(wants, 2),
            "percentage": 30,
            "description": "Lifestyle & Discretionary (Dining out, entertainment, subscriptions, hobbies)"
        },
        "savings_20": {
            "amount": round(savings, 2),
            "percentage": 20,
            "description": "Future Security & Investments (Emergency buffer, Mutual Fund SIPs, PPF/NPS)"
        },
        "guidance": "The 50/30/20 rule is an educational benchmark. Individuals in high-cost metro cities or with heavy obligations may adjust to 60/20/20 as necessary."
    }


def calculate_savings_rate(monthly_income: float, monthly_savings: float) -> Dict[str, Any]:
    """
    Calculate personal savings rate percentage: (Monthly Savings / Monthly Income) * 100.
    """
    if monthly_income <= 0:
        return {
            "success": False,
            "error": "Monthly income must be greater than zero."
        }
    if monthly_savings < 0:
        return {
            "success": False,
            "error": "Monthly savings cannot be negative."
        }
    if monthly_savings > monthly_income:
        return {
            "success": False,
            "error": "Monthly savings cannot exceed total monthly income."
        }

    rate = (monthly_savings / monthly_income) * 100.0

    verdict = ""
    if rate < 10.0:
        verdict = "Low (Aim to review non-essential expenses to build a 3-6 month emergency cushion)."
    elif rate < 20.0:
        verdict = "Fair (Decent baseline; try gradually stepping up savings via automated monthly SIPs)."
    elif rate < 35.0:
        verdict = "Strong (Well above average; provides healthy buffer for wealth creation and goals)."
    else:
        verdict = "Exceptional (Excellent discipline; ensure investments are diversified across asset classes)."

    return {
        "success": True,
        "calculator": "Personal Savings Rate",
        "monthly_income": round(monthly_income, 2),
        "monthly_savings": round(monthly_savings, 2),
        "savings_rate_pct": round(rate, 2),
        "health_rating": verdict,
        "formula": "(Monthly Savings / Monthly Income) × 100"
    }


def calculate_inflation_impact(present_amount: float, annual_inflation_pct: float, years: int) -> Dict[str, Any]:
    """
    Calculate future cost of current expenses and the eroded purchasing power of money:
    Future Cost = Present * (1 + inflation)^years
    Purchasing Power Retained = Present / (1 + inflation)^years
    """
    if present_amount <= 0 or annual_inflation_pct < 0 or years <= 0:
        return {
            "success": False,
            "error": "Present amount and years must be positive. Inflation cannot be negative."
        }

    i = annual_inflation_pct / 100.0
    future_cost = present_amount * ((1.0 + i) ** years)
    retained_value = present_amount / ((1.0 + i) ** years)
    purchasing_power_pct = (retained_value / present_amount) * 100.0

    return {
        "success": True,
        "calculator": "Inflation & Purchasing Power",
        "present_amount": round(present_amount, 2),
        "annual_inflation_pct": round(annual_inflation_pct, 2),
        "years": years,
        "future_cost_of_basket": round(future_cost, 2),
        "retained_purchasing_power": round(retained_value, 2),
        "purchasing_power_loss_pct": round(100.0 - purchasing_power_pct, 1),
        "explanation": (
            f"At {annual_inflation_pct}% annual inflation, a basket of goods that costs ₹{present_amount:,.2f} today "
            f"will cost ₹{future_cost:,.2f} in {years} years. Holding ₹{present_amount:,.2f} in non-earning cash "
            f"will retain only ₹{retained_value:,.2f} ({purchasing_power_pct:.1f}%) of real purchasing value."
        ),
        "disclaimer": "Inflation rates fluctuate based on RBI monetary policies, commodity cycles, and NSO CPI releases."
    }
