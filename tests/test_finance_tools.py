"""
test_finance_tools.py
=====================
Automated unit tests for deterministic financial calculators in finance_tools.py.
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University
"""

import pytest
from finance_tools import (
    calculate_simple_interest,
    calculate_compound_interest,
    calculate_emi,
    calculate_budget_50_30_20,
    calculate_savings_rate,
    calculate_inflation_impact
)


def test_simple_interest_valid():
    # P = 10,000, R = 7%, T = 2 years -> SI = 1400, Total = 11400
    res = calculate_simple_interest(10000, 7.0, 2.0)
    assert res["success"] is True
    assert res["interest_earned"] == 1400.00
    assert res["total_amount"] == 11400.00
    assert len(res["steps"]) > 0


def test_simple_interest_invalid():
    res = calculate_simple_interest(-5000, 5, 2)
    assert res["success"] is False
    assert "error" in res


def test_compound_interest_annual():
    # P = 10,000, R = 10%, T = 2 years, n = 1 -> A = 10000 * 1.10^2 = 12100
    res = calculate_compound_interest(10000, 10.0, 2.0, compounding_frequency=1)
    assert res["success"] is True
    assert res["total_amount"] == 12100.00
    assert res["interest_earned"] == 2100.00


def test_compound_interest_quarterly():
    # Quarterly compounding (n = 4)
    res = calculate_compound_interest(50000, 8.0, 3.0, compounding_frequency=4)
    assert res["success"] is True
    assert res["total_amount"] > 50000
    assert res["interest_earned"] > 0


def test_compound_interest_invalid():
    res = calculate_compound_interest(1000, -2, 1)
    assert res["success"] is False


def test_emi_standard():
    # P = 100,000, R = 12%, tenure = 12 months -> EMI ~ 8884.88
    res = calculate_emi(100000, 12.0, 12)
    assert res["success"] is True
    assert 8880 < res["monthly_emi"] < 8890
    assert res["total_amount_payable"] > 100000
    assert res["total_interest_payable"] > 0


def test_emi_5lakh_9_5pct_5years():
    # P = 500,000, R = 9.5%, tenure = 60 months (5 years) -> EMI ~ 10,500.93
    res = calculate_emi(500000, 9.5, 60)
    assert res["success"] is True
    assert round(res["monthly_emi"], 2) == 10500.93
    assert round(res["total_amount_payable"], 2) == 630055.80
    assert round(res["total_interest_payable"], 2) == 130055.80
    assert res["tenure_months"] == 60
    assert res["tenure_years"] == 5.0


def test_emi_zero_interest():
    res = calculate_emi(60000, 0.0, 6)
    assert res["success"] is True
    assert res["monthly_emi"] == 10000.00
    assert res["total_interest_payable"] == 0.00


def test_emi_invalid():
    res = calculate_emi(0, 10, 12)
    assert res["success"] is False


def test_budget_50_30_20():
    res = calculate_budget_50_30_20(50000)
    assert res["success"] is True
    assert res["needs_50"]["amount"] == 25000.00
    assert res["wants_30"]["amount"] == 15000.00
    assert res["savings_20"]["amount"] == 10000.00


def test_budget_invalid():
    res = calculate_budget_50_30_20(-1000)
    assert res["success"] is False


def test_savings_rate():
    res = calculate_savings_rate(60000, 18000)
    assert res["success"] is True
    assert res["savings_rate_pct"] == 30.00
    assert "Strong" in res["health_rating"]


def test_savings_rate_exceeds_income():
    res = calculate_savings_rate(50000, 60000)
    assert res["success"] is False


def test_inflation_impact():
    # Basket 100,000 at 6% inflation for 10 years -> ~179,084.77
    res = calculate_inflation_impact(100000, 6.0, 10)
    assert res["success"] is True
    assert res["future_cost_of_basket"] > 179000
    assert res["retained_purchasing_power"] < 100000
