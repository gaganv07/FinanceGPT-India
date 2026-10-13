"""
test_safety.py
==============
Automated tests for financial safety guardrails in safety.py.
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University
"""

import pytest
from safety import check_input_safety, attach_disclaimer, DISCLAIMER_TEXT


def test_credential_detection_card_number():
    res = check_input_safety("My credit card number is 4111 2222 3333 4444, can you check it?")
    assert res["safe"] is False
    assert res["action"] == "BLOCK_CREDENTIAL"
    assert "Security Warning" in res["message"]


def test_credential_detection_otp():
    res = check_input_safety("I received an OTP 482910 from my bank, what should I do?")
    assert res["safe"] is False
    assert res["action"] == "BLOCK_CREDENTIAL"


def test_credential_detection_pin():
    res = check_input_safety("My upi pin is 1234, is that safe?")
    assert res["safe"] is False
    assert res["action"] == "BLOCK_CREDENTIAL"


def test_scam_detection_guaranteed_returns():
    res = check_input_safety("Someone promised me guaranteed profit of 30% monthly in stock market.")
    assert res["safe"] is True  # Query is allowed, but flagged with warning
    assert res["action"] == "SCAM_ALERT"
    assert "Potential Financial Fraud Warning" in res["message"]


def test_scam_detection_double_money():
    res = check_input_safety("Can this scheme double your money in 21 days?")
    assert res["action"] == "SCAM_ALERT"


def test_normal_educational_query_safe():
    res = check_input_safety("What is compound interest and how does it help in long-term wealth?")
    assert res["safe"] is True
    assert res["action"] == "ALLOW"
    assert res["message"] == ""


def test_attach_disclaimer():
    answer = "A mutual fund pools money from multiple investors to buy a portfolio of assets."
    guarded = attach_disclaimer(answer)
    assert DISCLAIMER_TEXT in guarded
    # Check idempotency (no duplicate disclaimers)
    double_guarded = attach_disclaimer(guarded)
    assert double_guarded.count(DISCLAIMER_TEXT) == 1
