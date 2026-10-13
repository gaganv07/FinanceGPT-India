export interface DocumentChunk {
  chunk_id: string;
  source_id: string;
  document_title: string;
  source_org: string;
  source_url: string;
  topics: string[];
  page_number?: number | null;
  text: string;
  char_length: number;
  relevance_score?: number;
}

export interface SourceMetadata {
  id: string;
  title: string;
  source_org: string;
  url: string;
  type: string;
  topics: string[];
  license: string;
  publication_date?: string;
  retrieved_date?: string;
  char_count: number;
  processed_size_bytes: number;
  extraction_status: string;
}

export interface Citation {
  title: string;
  org: string;
  url: string;
  page?: number | null;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  retrieved_chunks: DocumentChunk[];
  is_grounded: boolean;
  safety_action: "ALLOW" | "BLOCK_CREDENTIAL" | "SCAM_ALERT" | "ADVISORY_REFUSAL";
  offline_mode?: boolean;
}

export interface SimpleInterestResult {
  success: boolean;
  error?: string;
  calculator?: string;
  principal?: number;
  annual_rate_pct?: number;
  time_years?: number;
  interest_earned?: number;
  total_amount?: number;
  formula?: string;
  steps?: string[];
  disclaimer?: string;
}

export interface CompoundInterestResult {
  success: boolean;
  error?: string;
  calculator?: string;
  principal?: number;
  annual_rate_pct?: number;
  time_years?: number;
  compounding_frequency?: string;
  interest_earned?: number;
  total_amount?: number;
  formula?: string;
  steps?: string[];
  disclaimer?: string;
}

export interface EmiResult {
  success: boolean;
  error?: string;
  calculator?: string;
  loan_principal?: number;
  annual_interest_rate_pct?: number;
  tenure_months?: number;
  tenure_years?: number;
  monthly_emi?: number;
  total_interest_payable?: number;
  total_amount_payable?: number;
  interest_to_principal_ratio_pct?: number;
  formula?: string;
  steps?: string[];
  disclaimer?: string;
}

export interface BudgetResult {
  success: boolean;
  error?: string;
  calculator?: string;
  monthly_income?: number;
  needs_50?: { amount: number; percentage: number; description: string };
  wants_30?: { amount: number; percentage: number; description: string };
  savings_20?: { amount: number; percentage: number; description: string };
  guidance?: string;
}

export interface SavingsRateResult {
  success: boolean;
  error?: string;
  calculator?: string;
  monthly_income?: number;
  monthly_savings?: number;
  savings_rate_pct?: number;
  health_rating?: string;
  formula?: string;
}

export interface InflationResult {
  success: boolean;
  error?: string;
  calculator?: string;
  present_amount?: number;
  annual_inflation_pct?: number;
  years?: number;
  future_cost_of_basket?: number;
  retained_purchasing_power?: number;
  purchasing_power_loss_pct?: number;
  explanation?: string;
  disclaimer?: string;
}
