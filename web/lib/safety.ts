export const DISCLAIMER_TEXT =
  "⚖️ **Educational Disclaimer:** FinanceGPT India is an academic project developed for financial " +
  "literacy demonstration by Gagan Gowda BM (BCA, Chanakya University). It is **not** registered with " +
  "SEBI (Securities and Exchange Board of India) or the RBI as an Investment Adviser (RIA), Portfolio Manager, " +
  "or Research Analyst. Information provided is for conceptual education only and should not be construed as " +
  "personalized investment, legal, or tax advice. Market investments are subject to risks. Always consult a qualified " +
  "SEBI-registered professional before making financial decisions.";

const SCAM_PATTERNS = [
  /guaranteed\s+(?:profit|return|income)/i,
  /double\s+(?:your\s+)?money\s+in\s+\d+/i,
  /100%\s+safe\s+and\s+risk-?free/i,
  /secret\s+(?:telegram|whatsapp)\s+tips/i,
  /pump\s+and\s+dump/i,
  /share\s+(?:your\s+)?otp\s+to\s+receive/i,
  /click\s+link\s+to\s+claim\s+lottery/i,
  /deposit\s+\d+\s+and\s+get\s+\d+\s+daily/i
];

const CREDENTIAL_PATTERNS: [RegExp, string][] = [
  [/\b(?:\d[ -]*?){15,16}\b/i, "Card Number (16-digit)"],
  [/\b(?:otp|one-?time\s+password)\s*(?:is|:)?\s*\d{4,6}\b/i, "One-Time Password (OTP)"],
  [/\b(?:upi\s*pin|atm\s*pin|mpin)\s*(?:is|:)?\s*\d{4,6}\b/i, "UPI/ATM PIN"],
  [/\b(?:password|pwd)\s*(?:is|:)?\s*\S{6,}\b/i, "Account Password"],
  [/\bcvv\s*(?:is|:)?\s*\d{3,4}\b/i, "Card CVV Code"]
];

export interface SafetyCheckResult {
  safe: boolean;
  action: "ALLOW" | "BLOCK_CREDENTIAL" | "SCAM_ALERT" | "ADVISORY_REFUSAL";
  message: string;
}

export function checkInputSafety(userText: string): SafetyCheckResult {
  const cleanQuery = (userText || "").trim().toLowerCase();

  // 1. Check for sensitive credentials
  for (const [pattern, credName] of CREDENTIAL_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        safe: false,
        action: "BLOCK_CREDENTIAL",
        message:
          `🚨 **Security Warning: ${credName} Detected!**\n\n` +
          "FinanceGPT India will never ask for and strongly advises you **never** to share passwords, " +
          "OTPs, UPI PINs, or card details in any chat, website, or over phone calls.\n\n" +
          "• **RBI Rule:** Banks and regulatory bodies *never* call or message asking for your OTP or PIN.\n" +
          "• If you have shared credentials with an unauthorized person, contact your bank immediately " +
          "and dial the National Cyber Helpline **1930**."
      };
    }
  }

  // 2. Check for scam keywords or unrealistic promises
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(cleanQuery)) {
      return {
        safe: true,
        action: "SCAM_ALERT",
        message:
          "⚠️ **Caution: Potential Financial Fraud Warning!**\n\n" +
          "You asked about guaranteed returns, doubling money, or unverified tip services. Please note:\n" +
          "1. **No Legitimate Investment Guarantees High Returns Without Risk:** SEBI strictly prohibits " +
          "guaranteed returns on market investments.\n" +
          "2. **Beware of Unregistered Groups:** Telegram and WhatsApp channels promising 'insider tips' or " +
          "'fixed daily profits' are common Ponzi or pump-and-dump operations.\n" +
          "3. **Verification:** Always verify if an advisor is SEBI-registered at [investor.sebi.gov.in](https://investor.sebi.gov.in)."
      };
    }
  }

  // 3. Check for requests for live speculative trading calls
  const speculativeTriggers = [
    "should i buy this stock today",
    "give me intraday call",
    "which penny stock to buy tomorrow"
  ];
  for (const trig of speculativeTriggers) {
    if (cleanQuery.includes(trig)) {
      return {
        safe: true,
        action: "ADVISORY_REFUSAL",
        message:
          "ℹ️ **General Education Notice:**\n\n" +
          "FinanceGPT India provides conceptual financial education and does not give personalized " +
          "stock recommendations, intraday calls, or short-term buy/sell signals. " +
          "For personalized portfolio planning, consult an authorized SEBI Registered Investment Adviser."
      };
    }
  }

  return { safe: true, action: "ALLOW", message: "" };
}

export function attachDisclaimer(answerText: string): string {
  const trimmed = (answerText || "").trim();
  if (!trimmed.includes(DISCLAIMER_TEXT)) {
    return `${trimmed}\n\n---\n${DISCLAIMER_TEXT}`;
  }
  return trimmed;
}
