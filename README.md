# FinanceGPT India — AI Financial Education Assistant 🪙

An AI-powered financial education chatbot and interactive financial calculator suite designed specifically for Indian retail investors, students, and beginners. Grounded exclusively on verified educational publications from the **Reserve Bank of India (RBI)** and the **Securities and Exchange Board of India (SEBI)**.

---

## 🎓 Student & Academic Details

- **Student Name:** Gagan Gowda BM
- **Registration Number:** `24UG00204`
- **Programme:** Bachelor of Computer Applications (BCA)
- **University:** Chanakya University
- **Development Environment:** Antigravity IDE on Windows (Python 3.11.9)
- **Project Name:** FinanceGPT India

---

## 1. Project Objective & Scope

FinanceGPT India provides accessible, factual, and beginner-friendly financial education across:
1. **Personal Budgeting & Saving:** The 50/30/20 framework, emergency cushions, and savings rate benchmarking.
2. **Interest & Time Value of Money:** Simple Interest (SI) and Compound Interest (CI) mechanics.
3. **Loans & Debt Discipline:** Equated Monthly Installment (EMI) calculations, total interest cost, and avoiding predatory unverified loan apps.
4. **Banking & Digital Payments:** Safe UPI usage, offline feature-phone payments via **UPI123Pay**, and the **DigiSaathi (14431 / 1800-891-3333)** 24x7 helpline.
5. **Customer Grievance Redressal:** The **RBI Integrated Ombudsman Scheme (RB-IOS)**, valid grounds, complaint timelines (30-day response window), and toll-free helpline **14448**.
6. **Macroeconomics & Inflation:** Consumer Price Index (CPI Combined) benchmarks, RBI Policy Repo Rate (5.50%), and real purchasing power erosion.
7. **Capital Markets & Mutual Funds:** Primary markets (IPOs, Red Herring Prospectus), secondary markets (Stock Exchanges, Demat, T+1 settlement), Mutual Fund Net Asset Value (NAV), and SIPs.
8. **Financial Fraud & Scam Prevention:** Detecting Ponzi schemes, fake social-media tips, SIM swaps, phishing/vishing calls, and OTP/PIN confidentiality.

> ⚖️ **Important Educational Disclaimer:**  
> FinanceGPT India is an academic and programming demonstration tool. It is **not** a SEBI-registered Investment Adviser (RIA) or Research Analyst. It does not provide personalized buy/sell calls, live stock recommendations, or guaranteed return promises.

---

## 2. Fundamental AI Concepts: Why RAG Instead of Training From Scratch?

Understanding where each AI technique fits in the system lifecycle is critical:

| AI / ML Concept | What It Actually Means | Role in FinanceGPT India |
| :--- | :--- | :--- |
| **1. Collecting a Dataset** | Gathering authoritative raw documents (PDFs, public press releases, economic tables) from verified regulators (RBI, SEBI). | Executed by `collect_dataset.py`. Only 0.59 MB of official files downloaded. |
| **2. Cleaning & Preparing Data** | Normalizing unicode whitespace, stripping page artifacts, removing duplicates, and structuring text. | Executed by `clean_text()` in `collect_dataset.py`. |
| **3. Building a Document Knowledge Base** | Organizing cleaned text into structured folders (`data/processed/` and `data/metadata/`) with full provenance metadata. | 335 chunks stored with URLs, page numbers, titles, and dates in `sources_metadata.json`. |
| **4. Creating Embeddings** | Converting textual concepts into dense numerical coordinate vectors. | Semantic search vectors computed for document passages. |
| **5. Building a Vector Index** | Indexing embeddings in an optimized retrieval structure (e.g. BM25 / vector space) for sub-millisecond similarity lookups. | Implemented in `rag.py` with zero GPU memory overhead. |
| **6. Fine-Tuning a Model** | Modifying an existing LLM's internal weights via backpropagation on specialized domain Q&A pairs. | **Not used here.** Indexing documents does *not* modify model weights. |
| **7. Training From Scratch** | Initializing neural weights randomly and spending millions of dollars across thousands of GPUs over months. | **Never required** for application-level chatbots. |

> 💡 **Key Takeaway:** In **Retrieval-Augmented Generation (RAG)**, the underlying language model remains **completely frozen and un-tuned**. It serves strictly as an intelligent reader and synthesis engine over dynamically retrieved passages.

---

## 3. System Architecture

```mermaid
flowchart TD
    UserQuery([User Input / Question]) --> SafetyGuard{Safety & Intent Guardrail\nsafety.py}
    
    SafetyGuard -->|Credential Detected (PIN, OTP, Card)| BlockCred[Security Alert & Refusal Response]
    SafetyGuard -->|Scam Keywords (Guaranteed Profit, Double Money)| ScamAlert[Fraud Warning Banner]
    SafetyGuard -->|Numerical Calculation (EMI, CI, SI, Budget)| CalcEngine[Deterministic Finance Calculators\nfinance_tools.py]
    SafetyGuard -->|Educational Question| Retriever[Lightweight Hybrid Retriever\nrag.py]
    
    subgraph DataPipeline [Online Collection & Processing Pipeline]
        OfficialSources[SEBI & RBI Online Portals] --> Collector[collect_dataset.py]
        Collector --> RawFiles[data/raw/*.pdf]
        Collector --> CleanText[data/processed/*.txt]
        Collector --> Manifest[data/metadata/sources_metadata.json]
        CleanText --> Chunker[data_loader.py\n335 Chunks]
    end
    
    Chunker --> Retriever
    Retriever -->|Top-K Context + Page Citations| PromptAssembly[Prompt Assembly]
    PromptAssembly --> GeminiLLM[Google Gemini API]
    
    CalcEngine --> StreamlitUI[Streamlit Web UI\napp.py]
    BlockCred --> StreamlitUI
    ScamAlert --> StreamlitUI
    GeminiLLM --> StreamlitUI
```

---

## 4. Official Dataset Provenance Manifest

The knowledge base was automatically collected from legitimate, public Indian investor education portals:

| # | Document Title | Source Organization | Official URL | Size |
|---|---|---|---|---|
| **1** | Guide to Mutual Funds & NAV | SEBI | [MFunds.pdf](https://investor.sebi.gov.in/pdf/reference-material/MFunds.pdf) | 29.8 KB |
| **2** | Beginner's Guide to Financial Planning | SEBI | [beginners.pdf](https://investor.sebi.gov.in/pdf/reference-material/beginners.pdf) | 64.8 KB |
| **3** | Primary Markets & IPO Process | SEBI | [primarymarkets.pdf](https://investor.sebi.gov.in/pdf/reference-material/primarymarkets.pdf) | 140.3 KB |
| **4** | Secondary Markets & Trading Safeguards | SEBI | [Secondaryma.pdf](https://investor.sebi.gov.in/pdf/reference-material/Secondaryma.pdf) | 24.2 KB |
| **5** | Investor Protection: Do's & Don'ts | SEBI | [dos-and-donts.pdf](https://investor.sebi.gov.in/pdf/reference-material/dos-and-donts-for-investors-investment-advisers.pdf) | 90.7 KB |
| **6** | Equities vs Debentures & Corporate Bonds | SEBI | [sharedebentureholder.pdf](https://investor.sebi.gov.in/pdf/reference-material/sharedebentureholder.pdf) | 144.6 KB |
| **7** | UPI123Pay & DigiSaathi Helpline | RBI | [Press Release 53385](https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=53385) | 3.1 KB |
| **8** | Integrated Ombudsman Scheme (RB-IOS) | RBI | [cms.rbi.org.in](https://cms.rbi.org.in) | 2.4 KB |
| **9** | BE(A)WARE Financial Fraud Prevention | RBI | [financialeducation](https://www.rbi.org.in/financialeducation/) | 2.9 KB |
| **10** | Macroeconomic Aggregates & CPI Target | RBI | [rbi.org.in](https://www.rbi.org.in) | 1.9 KB |

- **Total Raw Storage:** 0.59 MB
- **Total Processed Text Storage:** 0.19 MB (197.8 KB)
- **Total Chunks:** 335 clean passages with preserved citations

---

## 5. Project Directory Structure

```
d:\FinanceGPT\
├── .env.example              <- Environment variable template
├── .gitignore                <- Excludes .env, caches, venv, and large files
├── requirements.txt          <- Minimal, lightweight dependencies (no PyTorch)
├── pytest.ini                <- Pytest configuration
├── README.md                 <- Complete project documentation
├── collect_dataset.py        <- Automated online dataset collector
├── data_loader.py            <- Document chunking and metadata preservation
├── rag.py                    <- Lightweight hybrid retrieval & Gemini answer engine
├── finance_tools.py          <- Deterministic financial calculators
├── safety.py                 <- Financial safety, PII detection & disclaimers
├── app.py                    <- Streamlit web interface
├── data/
│   ├── raw/                  <- Downloaded official source files (607 KB)
│   ├── processed/            <- Cleaned text files (197 KB)
│   └── metadata/             <- sources_metadata.json provenance manifest
├── vector_store/             <- Cached chunks and indexed artifacts
└── tests/
    ├── test_data_loader.py   <- Tests for chunking and metadata
    ├── test_finance_tools.py <- Tests for financial formulas and edge cases
    ├── test_rag.py           <- Tests for retrieval and grounded answering
    └── test_safety.py        <- Tests for credential protection and scam warnings
```

---

## 6. Installation & Local Setup (Windows PowerShell)

### Step 1: Open Terminal in Project Directory
```powershell
cd D:\FinanceGPT
```

### Step 2: Create and Activate Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3: Install Lightweight Dependencies
```powershell
pip install --no-cache-dir -r requirements.txt
```

### Step 4: Configure Gemini API Key
Create a `.env` file from `.env.example`:
```powershell
Copy-Item .env.example .env
```
Open `.env` in any text editor and paste your free Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```
*(Get a free API key at [aistudio.google.com](https://aistudio.google.com/)).*

### Step 5: (Optional) Re-run Dataset Collection
```powershell
python collect_dataset.py
```

### Step 6: Run Automated Tests
```powershell
pytest -v
```
*(All 31 unit tests should pass with 100% success).*

### Step 7: Launch Streamlit Application
```powershell
streamlit run app.py
```
The application will open automatically at `http://localhost:8501`.

---

## 7. Automated Test Suite Results

Tested with `pytest 9.1.1` on Python 3.11.9:
```
tests/test_data_loader.py::test_chunk_text_basic PASSED
tests/test_data_loader.py::test_chunk_text_empty PASSED
tests/test_data_loader.py::test_metadata_manifest_exists PASSED
tests/test_data_loader.py::test_load_all_chunks_has_metadata PASSED
tests/test_data_loader.py::test_dataset_stats PASSED
tests/test_finance_tools.py::test_simple_interest_valid PASSED
tests/test_finance_tools.py::test_simple_interest_invalid PASSED
tests/test_finance_tools.py::test_compound_interest_annual PASSED
tests/test_finance_tools.py::test_compound_interest_quarterly PASSED
tests/test_finance_tools.py::test_compound_interest_invalid PASSED
tests/test_finance_tools.py::test_emi_standard PASSED
tests/test_finance_tools.py::test_emi_zero_interest PASSED
tests/test_finance_tools.py::test_emi_invalid PASSED
tests/test_finance_tools.py::test_budget_50_30_20 PASSED
tests/test_finance_tools.py::test_budget_invalid PASSED
tests/test_finance_tools.py::test_savings_rate PASSED
tests/test_finance_tools.py::test_savings_rate_exceeds_income PASSED
tests/test_finance_tools.py::test_inflation_impact PASSED
tests/test_rag.py::test_retriever_financial_terms PASSED
tests/test_rag.py::test_retriever_banking_ombudsman PASSED
tests/test_rag.py::test_retriever_upi123pay PASSED
tests/test_rag.py::test_rag_blocked_credentials PASSED
tests/test_rag.py::test_rag_missing_or_obscure_topic PASSED
tests/test_rag.py::test_rag_offline_grounding_citations PASSED
tests/test_safety.py::test_credential_detection_card_number PASSED
tests/test_safety.py::test_credential_detection_otp PASSED
tests/test_safety.py::test_credential_detection_pin PASSED
tests/test_safety.py::test_scam_detection_guaranteed_returns PASSED
tests/test_safety.py::test_scam_detection_double_money PASSED
tests/test_safety.py::test_normal_educational_query_safe PASSED
tests/test_safety.py::test_attach_disclaimer PASSED

31 passed in 0.66s (100% pass rate)
```

---

## 8. Deployment to Streamlit Community Cloud

1. **Push Code to GitHub:**
   ```powershell
   git init
   git add .
   git commit -m "Initial release of FinanceGPT India"
   git branch -M main
   git remote add origin https://github.com/your-username/FinanceGPT-India.git
   git push -u origin main
   ```
   *(Ensure `.env` is ignored by `.gitignore`).*

2. **Deploy on Streamlit Cloud:**
   - Go to [share.streamlit.io](https://share.streamlit.io/) and connect your GitHub repository.
   - Set **Main file path** to `app.py`.
   - In **Advanced Settings -> Secrets**, add:
     ```toml
     GEMINI_API_KEY = "your_actual_gemini_api_key_here"
     ```
   - Click **Deploy**. Your app will be live with a public URL!
