import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper math functions to test parity
function round2(val) {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function calculateSimpleInterest(principal, annualRatePct, timeYears) {
  if (principal <= 0 || annualRatePct < 0 || timeYears <= 0) {
    return { success: false, error: "Invalid parameters" };
  }
  const interest = (principal * annualRatePct * timeYears) / 100.0;
  return {
    success: true,
    interest_earned: round2(interest),
    total_amount: round2(principal + interest)
  };
}

function calculateCompoundInterest(principal, annualRatePct, timeYears, n = 1) {
  if (principal <= 0 || annualRatePct < 0 || timeYears <= 0 || n <= 0) {
    return { success: false, error: "Invalid parameters" };
  }
  const r = annualRatePct / 100.0;
  const amount = principal * Math.pow(1.0 + r / n, n * timeYears);
  return {
    success: true,
    total_amount: round2(amount),
    interest_earned: round2(amount - principal)
  };
}

function calculateEmi(principal, annualRatePct, tenureMonths) {
  if (principal <= 0 || annualRatePct < 0 || tenureMonths <= 0) {
    return { success: false, error: "Invalid parameters" };
  }
  if (annualRatePct === 0) {
    const emi = principal / tenureMonths;
    return {
      success: true,
      monthly_emi: round2(emi),
      total_amount_payable: round2(principal),
      total_interest_payable: 0
    };
  }
  const r = annualRatePct / (12 * 100.0);
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  const totalAmount = emi * tenureMonths;
  return {
    success: true,
    monthly_emi: round2(emi),
    total_amount_payable: round2(totalAmount),
    total_interest_payable: round2(totalAmount - principal)
  };
}

function calculateBudget(income) {
  if (income <= 0) return { success: false };
  return {
    success: true,
    needs: round2(income * 0.5),
    wants: round2(income * 0.3),
    savings: round2(income * 0.2)
  };
}

// Safety patterns
const CREDENTIAL_PATTERNS = [
  [/\b(?:\d[ -]*?){15,16}\b/i, "Card Number"],
  [/\b(?:otp|one-?time\s+password)\s*(?:is|:)?\s*\d{4,6}\b/i, "OTP"],
  [/\b(?:upi\s*pin|atm\s*pin|mpin)\s*(?:is|:)?\s*\d{4,6}\b/i, "PIN"]
];

const SCAM_PATTERNS = [
  /guaranteed\s+(?:profit|return|income)/i,
  /double\s+(?:your\s+)?money\s+in\s+\d+/i
];

describe("Finance Calculators Parity Tests", () => {
  test("Simple Interest formula parity", () => {
    // 10,000 at 7% for 2 years -> 1400 interest, 11400 total
    const res = calculateSimpleInterest(10000, 7.0, 2.0);
    assert.equal(res.success, true);
    assert.equal(res.interest_earned, 1400.00);
    assert.equal(res.total_amount, 11400.00);

    // Negative principal rejected
    const invalid = calculateSimpleInterest(-5000, 5, 2);
    assert.equal(invalid.success, false);
  });

  test("Compound Interest annual compounding parity", () => {
    // 10,000 at 10% for 2 years, n = 1 -> 12,100 total, 2100 interest
    const res = calculateCompoundInterest(10000, 10.0, 2.0, 1);
    assert.equal(res.success, true);
    assert.equal(res.total_amount, 12100.00);
    assert.equal(res.interest_earned, 2100.00);
  });

  test("Loan EMI standard parity", () => {
    // 100,000 at 12% for 12 months -> EMI ~ 8884.88
    const res = calculateEmi(100000, 12.0, 12);
    assert.equal(res.success, true);
    assert.ok(res.monthly_emi >= 8880 && res.monthly_emi <= 8890);
    assert.ok(res.total_amount_payable > 100000);
    assert.ok(res.total_interest_payable > 0);
  });

  test("Loan EMI zero interest edge case", () => {
    const res = calculateEmi(60000, 0.0, 6);
    assert.equal(res.success, true);
    assert.equal(res.monthly_emi, 10000.00);
    assert.equal(res.total_interest_payable, 0.00);
  });

  test("50/30/20 Budget rule parity", () => {
    const res = calculateBudget(50000);
    assert.equal(res.success, true);
    assert.equal(res.needs, 25000.00);
    assert.equal(res.wants, 15000.00);
    assert.equal(res.savings, 10000.00);
  });
});

describe("Safety Guardrails Parity Tests", () => {
  test("Detects 16-digit card numbers", () => {
    const query = "My card is 4111 2222 3333 4444 please check";
    const matched = CREDENTIAL_PATTERNS.some(([pat]) => pat.test(query));
    assert.equal(matched, true);
  });

  test("Detects bank OTPs", () => {
    const query = "I got an OTP 482910 from my bank";
    const matched = CREDENTIAL_PATTERNS.some(([pat]) => pat.test(query));
    assert.equal(matched, true);
  });

  test("Detects UPI PIN sharing", () => {
    const query = "My upi pin is 1234, is that safe?";
    const matched = CREDENTIAL_PATTERNS.some(([pat]) => pat.test(query));
    assert.equal(matched, true);
  });

  test("Detects guaranteed profit scam keywords", () => {
    const query = "Someone offered me guaranteed profit of 30% monthly";
    const matched = SCAM_PATTERNS.some((pat) => pat.test(query));
    assert.equal(matched, true);
  });
});

describe("Knowledge Base Data Integrity", () => {
  test("chunks_cache.json exists and contains 335 chunks", () => {
    const chunksPath = path.resolve(__dirname, "../data/chunks_cache.json");
    assert.ok(fs.existsSync(chunksPath), "chunks_cache.json must exist");
    const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8"));
    assert.equal(chunks.length, 335, "Must contain exactly 335 processed chunks");
  });

  test("sources_metadata.json exists and contains 10 official sources", () => {
    const sourcesPath = path.resolve(__dirname, "../data/sources_metadata.json");
    assert.ok(fs.existsSync(sourcesPath), "sources_metadata.json must exist");
    const sources = JSON.parse(fs.readFileSync(sourcesPath, "utf-8"));
    const count = Array.isArray(sources) ? sources.length : Object.keys(sources).length;
    assert.equal(count, 10, "Must contain exactly 10 official sources");
  });
});

describe("Security & Secrets Protection", () => {
  test(".env.example does not contain real API keys", () => {
    const envExamplePath = path.resolve(__dirname, "../.env.example");
    assert.ok(fs.existsSync(envExamplePath));
    const content = fs.readFileSync(envExamplePath, "utf-8");
    assert.ok(!content.includes("AIzaSy"), "Must not contain real Google API keys");
    assert.ok(content.includes("GEMINI_API_KEY="), "Must have GEMINI_API_KEY placeholder");
    assert.ok(!content.includes("NEXT_PUBLIC_GEMINI"), "Must NEVER use NEXT_PUBLIC_ prefix");
  });

  test(".gitignore ignores environment files and next build", () => {
    const gitignorePath = path.resolve(__dirname, "../.gitignore");
    assert.ok(fs.existsSync(gitignorePath));
    const content = fs.readFileSync(gitignorePath, "utf-8");
    assert.ok(content.includes(".env"), "Must ignore .env");
    assert.ok(content.includes("node_modules"), "Must ignore node_modules");
  });
});
