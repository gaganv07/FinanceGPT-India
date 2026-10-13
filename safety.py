"""
safety.py
=========
FinanceGPT India — Financial Safety, Guardrails & Disclaimer Module
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University

Implements:
1. Regulatory disclaimers (SEBI/RBI educational compliance)
2. Sensitive credential detection (PINs, OTPs, CVVs, Passwords)
3. Financial scam and fraudulent promises detection
4. Grounding and non-advisory enforcement
"""

import re
from typing import Dict, Any, Tuple

# Official educational disclaimer
DISCLAIMER_TEXT = (
    "⚖️ **Educational Disclaimer:** FinanceGPT India is an academic project developed for financial "
    "literacy demonstration by Gagan Gowda BM (BCA, Chanakya University). It is **not** registered with "
    "SEBI (Securities and Exchange Board of India) or the RBI as an Investment Adviser (RIA), Portfolio Manager, "
    "or Research Analyst. Information provided is for conceptual education only and should not be construed as "
    "personalized investment, legal, or tax advice. Market investments are subject to risks. Always consult a qualified "
    "SEBI-registered professional before making financial decisions."
)

SCAM_PATTERNS = [
    r"guaranteed\s+(?:profit|return|income)",
    r"double\s+(?:your\s+)?money\s+in\s+\d+",
    r"100%\s+safe\s+and\s+risk-?free",
    r"secret\s+(?:telegram|whatsapp)\s+tips",
    r"pump\s+and\s+dump",
    r"share\s+(?:your\s+)?otp\s+to\s+receive",
    r"click\s+link\s+to\s+claim\s+lottery",
    r"deposit\s+\d+\s+and\s+get\s+\d+\s+daily"
]

CREDENTIAL_PATTERNS = [
    (r"\b(?:\d[ -]*?){15,16}\b", "Card Number (16-digit)"),
    (r"\b(?:otp|one-?time\s+password)\s*(?:is|:)?\s*\d{4,6}\b", "One-Time Password (OTP)"),
    (r"\b(?:upi\s*pin|atm\s*pin|mpin)\s*(?:is|:)?\s*\d{4,6}\b", "UPI/ATM PIN"),
    (r"\b(?:password|pwd)\s*(?:is|:)?\s*\S{6,}\b", "Account Password"),
    (r"\bcvv\s*(?:is|:)?\s*\d{3,4}\b", "Card CVV Code")
]


def check_input_safety(user_text: str) -> Dict[str, Any]:
    """
    Inspects user input for sensitive financial credentials or scam queries.
    Returns a status dict indicating whether input is safe, a warning, or a refusal.
    """
    clean_query = user_text.strip().lower()

    # 1. Check for sensitive credentials
    for pattern, cred_name in CREDENTIAL_PATTERNS:
        if re.search(pattern, clean_query, flags=re.IGNORECASE):
            return {
                "safe": False,
                "action": "BLOCK_CREDENTIAL",
                "message": (
                    f"🚨 **Security Warning: {cred_name} Detected!**\n\n"
                    "FinanceGPT India will never ask for and strongly advises you **never** to share passwords, "
                    "OTPs, UPI PINs, or card details in any chat, website, or over phone calls.\n\n"
                    "• **RBI Rule:** Banks and regulatory bodies *never* call or message asking for your OTP or PIN.\n"
                    "• If you have shared credentials with an unauthorized person, contact your bank immediately "
                    "and dial the National Cyber Helpline **1930**."
                )
            }

    # 2. Check for scam keywords or unrealistic promises
    for pattern in SCAM_PATTERNS:
        if re.search(pattern, clean_query, flags=re.IGNORECASE):
            return {
                "safe": True,
                "action": "SCAM_ALERT",
                "message": (
                    "⚠️ **Caution: Potential Financial Fraud Warning!**\n\n"
                    "You asked about guaranteed returns, doubling money, or unverified tip services. Please note:\n"
                    "1. **No Legitimate Investment Guarantees High Returns Without Risk:** SEBI strictly prohibits "
                    "guaranteed returns on market investments.\n"
                    "2. **Beware of Unregistered Groups:** Telegram and WhatsApp channels promising 'insider tips' or "
                    "'fixed daily profits' are common Ponzi or pump-and-dump operations.\n"
                    "3. **Verification:** Always verify if an advisor is SEBI-registered at [investor.sebi.gov.in](https://investor.sebi.gov.in)."
                )
            }

    # 3. Check for requests for live speculative trading calls
    speculative_triggers = ["should i buy this stock today", "give me intraday call", "which penny stock to buy tomorrow"]
    for trig in speculative_triggers:
        if trig in clean_query:
            return {
                "safe": True,
                "action": "ADVISORY_REFUSAL",
                "message": (
                    "ℹ️ **General Education Notice:**\n\n"
                    "FinanceGPT India provides conceptual financial education and does not give personalized "
                    "stock recommendations, intraday calls, or short-term buy/sell signals. "
                    "For personalized portfolio planning, consult an authorized SEBI Registered Investment Adviser."
                )
            }

    return {"safe": True, "action": "ALLOW", "message": ""}


def attach_disclaimer(answer_text: str) -> str:
    """Appends official educational disclaimer to generated answers."""
    if DISCLAIMER_TEXT not in answer_text:
        return f"{answer_text.strip()}\n\n---\n{DISCLAIMER_TEXT}"
    return answer_text
