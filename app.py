"""
app.py
======
FinanceGPT India — Premium AI Financial Education Assistant
Author: Gagan Gowda BM (Registration Number: 24UG00204)
Programme: BCA | University: Chanakya University

Modern Fintech SaaS Interface:
- Deep Navy & Charcoal Theme with Mint/Teal Accents
- Grounded RAG Q&A using SEBI & RBI official documents
- Transparent Financial Calculators (EMI, CI, SI, Budgeting, Inflation)
- Knowledge Base Management & Official Sources Explorer
"""

import os
import streamlit as st
from pathlib import Path
from dotenv import load_dotenv

# Load local environment variables from .env
load_dotenv()

from data_loader import get_dataset_stats, chunk_text, clean_text
from rag import generate_grounded_answer, rebuild_vector_index, retrieve_context
from safety import DISCLAIMER_TEXT, check_input_safety
import finance_tools as ft

# ------------------------------------------------------------------------------
# 1. Page Configuration
# ------------------------------------------------------------------------------
st.set_page_config(
    page_title="FinanceGPT India — AI Financial Education Assistant",
    page_icon="🪙",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ------------------------------------------------------------------------------
# 2. Modern Fintech SaaS Design System (CSS)
# ------------------------------------------------------------------------------
st.markdown("""
<style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Core Canvas Background */
    .stApp {
        background: linear-gradient(180deg, #0A0E17 0%, #0F172A 100%);
        color: #F1F5F9;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #0B0F19 !important;
        border-right: 1px solid rgba(255, 255, 255, 0.08);
    }
    section[data-testid="stSidebar"] div[data-testid="stVerticalBlock"] {
        gap: 0.8rem;
    }

    /* Typography Utilities */
    .hero-title {
        font-size: 2.1rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #F8FAFC;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .hero-subtitle {
        font-size: 1.05rem;
        font-weight: 500;
        color: #94A3B8;
        margin-bottom: 20px;
        line-height: 1.5;
    }

    /* Glass Cards */
    .fintech-card {
        background: rgba(17, 24, 39, 0.7);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 16px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.25);
    }

    /* Metric Display Cards */
    .metric-container {
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 16px;
        text-align: left;
    }
    .metric-label {
        font-size: 0.82rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94A3B8;
        margin-bottom: 6px;
    }
    .metric-value {
        font-size: 1.6rem;
        font-weight: 800;
        color: #F8FAFC;
        font-family: 'JetBrains Mono', monospace;
    }
    .metric-subtext {
        font-size: 0.8rem;
        color: #10B981;
        margin-top: 4px;
    }

    /* Status Badges */
    .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .badge-connected {
        background: rgba(16, 185, 129, 0.15);
        color: #34D399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-offline {
        background: rgba(245, 158, 11, 0.15);
        color: #FBBF24;
        border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-rbi {
        background: rgba(14, 165, 233, 0.15);
        color: #38BDF8;
        border: 1px solid rgba(14, 165, 233, 0.3);
    }
    .badge-sebi {
        background: rgba(168, 85, 247, 0.15);
        color: #C084FC;
        border: 1px solid rgba(168, 85, 247, 0.3);
    }

    /* Suggested Question Cards */
    .suggestion-btn {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px;
        padding: 14px;
        text-align: left;
        transition: all 0.2s ease;
        cursor: pointer;
    }
    .suggestion-btn:hover {
        background: rgba(30, 41, 59, 1);
        border-color: #0D9488;
        transform: translateY(-2px);
    }

    /* Citation Card */
    .citation-card {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 12px 16px;
        margin-top: 10px;
        font-size: 0.86rem;
    }

    /* Academic Attribution Banner */
    .student-badge-card {
        background: rgba(13, 148, 136, 0.08);
        border: 1px solid rgba(13, 148, 136, 0.25);
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 0.84rem;
        color: #99F6E4;
        margin-bottom: 18px;
    }

    /* Refined Streamlit Buttons */
    .stButton>button {
        background: #1E293B;
        color: #F8FAFC;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        font-weight: 600;
        padding: 0.5rem 1rem;
        transition: all 0.2s ease;
    }
    .stButton>button:hover {
        background: #0D9488;
        border-color: #14B8A6;
        color: #FFFFFF;
    }

    /* Input Fields */
    .stTextInput>div>div>input, .stNumberInput>div>div>input {
        background: #1E293B !important;
        color: #F8FAFC !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-radius: 8px !important;
    }

    /* Tabs Styling */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 6px;
    }
    .stTabs [data-baseweb="tab"] {
        background: transparent;
        border-radius: 6px;
        color: #94A3B8;
        font-weight: 600;
        padding: 8px 16px;
    }
    .stTabs [aria-selected="true"] {
        background: rgba(13, 148, 136, 0.15) !important;
        color: #2DD4BF !important;
        border: 1px solid rgba(13, 148, 136, 0.4) !important;
    }

    /* Chat message bubble refinement */
    div[data-testid="stChatMessage"] {
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 12px;
    }
</style>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# 3. Environment & Credentials Resolution
# ------------------------------------------------------------------------------
api_key_env = os.getenv("GEMINI_API_KEY", "")
api_key_secrets = ""
try:
    if hasattr(st, "secrets") and "GEMINI_API_KEY" in st.secrets:
        api_key_secrets = st.secrets["GEMINI_API_KEY"]
except Exception:
    pass

resolved_key = api_key_secrets or api_key_env

# ------------------------------------------------------------------------------
# 4. Sidebar: Branding, Navigation & Settings
# ------------------------------------------------------------------------------
with st.sidebar:
    # Branding
    st.markdown("""
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
        <span style="font-size: 1.8rem;">🪙</span>
        <div>
            <div style="font-weight: 800; font-size: 1.15rem; color: #F8FAFC; letter-spacing: -0.02em;">FinanceGPT India</div>
            <div style="font-size: 0.72rem; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em;">AI Financial Education</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Academic Project Badge
    st.markdown("""
    <div style="background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 6px 10px; font-size: 0.74rem; color: #CBD5E1; margin-bottom: 12px;">
        <strong>Gagan Gowda BM</strong> • <code>24UG00204</code><br>
        BCA • Chanakya University
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # Primary Navigation (Single-page app routing)
    selected_page = st.radio(
        "Navigation",
        [
            "💬 Chat Assistant",
            "🧮 Financial Calculators",
            "📚 Knowledge Base",
            "🏛️ Official Sources"
        ],
        label_visibility="collapsed"
    )

    st.markdown("---")

    # API Connection Status Indicator
    has_active_key = bool(resolved_key.strip())
    if has_active_key:
        st.markdown('<div class="badge-pill badge-connected">● Gemini AI Connected</div>', unsafe_allow_html=True)
    else:
        st.markdown('<div class="badge-pill badge-offline">○ Local Corpus Mode</div>', unsafe_allow_html=True)

    # Expandable Settings
    with st.expander("⚙️ Settings & API Config", expanded=False):
        user_api_key = st.text_input(
            "Gemini API Key:",
            value=resolved_key,
            type="password",
            help="Free key from https://aistudio.google.com. Key is kept in session memory and never printed."
        )
        selected_model = st.selectbox(
            "Model Selection:",
            ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"],
            index=0
        )
        st.caption("🔒 Key is masked and never displayed in application logs.")

    # Chat Actions
    if st.button("🗑️ Clear Conversation", use_container_width=True):
        st.session_state.messages = []
        st.session_state.submitted_prompt = None
        st.rerun()

    st.markdown("---")

    # Compact Knowledge Base Stats
    kb_stats = get_dataset_stats()
    st.markdown("<div style='font-size: 0.78rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 6px;'>Corpus Telemetry</div>", unsafe_allow_html=True)
    c_s1, c_s2 = st.columns(2)
    with c_s1:
        st.markdown(f"""
        <div style="background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.1rem; font-weight: 800; color: #38BDF8; font-family: monospace;">{kb_stats['num_sources']}</div>
            <div style="font-size: 0.68rem; color: #94A3B8;">Sources</div>
        </div>
        """, unsafe_allow_html=True)
    with c_s2:
        st.markdown(f"""
        <div style="background: rgba(15,23,42,0.5); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
            <div style="font-size: 1.1rem; font-weight: 800; color: #2DD4BF; font-family: monospace;">{kb_stats['num_chunks']}</div>
            <div style="font-size: 0.68rem; color: #94A3B8;">Passages</div>
        </div>
        """, unsafe_allow_html=True)


# ------------------------------------------------------------------------------
# 5. Shared Header & Academic Disclaimer
# ------------------------------------------------------------------------------
st.markdown("""
<div class="student-badge-card">
    🎓 <strong>Chanakya University BCA Project</strong> | Student: <strong>Gagan Gowda BM</strong> (Reg: <code>24UG00204</code>) •
    Grounded in verified regulatory literature from the <strong>Reserve Bank of India (RBI)</strong> and <strong>Securities and Exchange Board of India (SEBI)</strong>.
</div>
""", unsafe_allow_html=True)


# ==============================================================================
# PAGE 1: CHAT ASSISTANT
# ==============================================================================
if selected_page == "💬 Chat Assistant":
    st.markdown('<div class="hero-title">🪙 FinanceGPT India</div>', unsafe_allow_html=True)
    st.markdown('<div class="hero-subtitle">Your personal finance learning companion. Factual, grounded financial education for Indian retail investors and students.</div>', unsafe_allow_html=True)

    # Offline notice if API key is absent
    effective_api_key = user_api_key.strip()
    if not effective_api_key:
        st.markdown("""
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 10px 14px; font-size: 0.83rem; color: #FCD34D; margin-bottom: 16px;">
            ℹ️ <strong>Offline Retrieval Active:</strong> Running in local mode without a Gemini API key. Passages from SEBI & RBI documents will be retrieved and displayed as verified excerpts. To enable synthesized AI answers, add a free key in <em>Settings</em> in the sidebar.
        </div>
        """, unsafe_allow_html=True)

    # Initialize chat session
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "submitted_prompt" not in st.session_state:
        st.session_state.submitted_prompt = None

    # Suggested Questions (Rendered neatly when conversation is young)
    if len(st.session_state.messages) == 0:
        st.markdown("<div style='font-size: 0.88rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 10px;'>💡 Explore Suggested Questions:</div>", unsafe_allow_html=True)
        sq_col1, sq_col2, sq_col3 = st.columns(3)
        with sq_col1:
            if st.button("📊 Saving vs. Investing", use_container_width=True, help="Difference between capital preservation and market growth"):
                st.session_state.submitted_prompt = "What is the key difference between saving and investing according to SEBI educational booklets?"
            if st.button("📉 Inflation & Purchasing Power", use_container_width=True, help="How CPI inflation erodes wealth"):
                st.session_state.submitted_prompt = "What is CPI inflation and how does it erode purchasing power over a 10-year horizon?"
        with sq_col2:
            if st.button("📈 Mutual Funds & NAV", use_container_width=True, help="Mutual fund unit mechanics and NAV calculation"):
                st.session_state.submitted_prompt = "What are mutual funds, how is Net Asset Value (NAV) determined, and what is an SIP?"
            if st.button("🛡️ Digital Payment Fraud", use_container_width=True, help="UPI safety, feature phones and DigiSaathi"):
                st.session_state.submitted_prompt = "What is UPI123Pay for feature phones, what is the DigiSaathi helpline, and how do I avoid UPI fraud?"
        with sq_col3:
            if st.button("🏦 Loan EMI & True Cost", use_container_width=True, help="How loan amortization works"):
                st.session_state.submitted_prompt = "How does an EMI work, and how can borrowers calculate total repayment cost?"
            if st.button("⚖️ Banking Ombudsman (RB-IOS)", use_container_width=True, help="How to resolve bank disputes"):
                st.session_state.submitted_prompt = "How do I file a complaint with the RBI Banking Ombudsman, what is the 30-day rule, and what is toll-free number 14448?"

    # Render persistent conversation history
    for msg in st.session_state.messages:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg.get("citations"):
                with st.expander("📚 Sources & References (SEBI & RBI)", expanded=False):
                    for c in msg["citations"]:
                        page_txt = f" • Page {c['page']}" if c.get("page") else ""
                        st.markdown(f"""
                        <div class="citation-card">
                            <strong>{c['title']}</strong> <span class="badge-pill badge-rbi">{c['org']}</span>{page_txt}<br>
                            <a href="{c['url']}" target="_blank" style="color: #2DD4BF; text-decoration: none; font-size: 0.8rem;">Open Verified Document ↗</a>
                        </div>
                        """, unsafe_allow_html=True)

    # Chat Input Box
    chat_query = st.chat_input("Ask a question on budgeting, mutual funds, loans, banking, or inflation...")
    active_prompt = chat_query or st.session_state.submitted_prompt

    if active_prompt:
        st.session_state.submitted_prompt = None

        # Display User Query
        st.session_state.messages.append({"role": "user", "content": active_prompt})
        with st.chat_message("user"):
            st.markdown(active_prompt)

        # Generate Assistant Response
        with st.chat_message("assistant"):
            with st.spinner("Searching official SEBI & RBI documents..."):
                response_data = generate_grounded_answer(
                    user_query=active_prompt,
                    api_key=effective_api_key if effective_api_key else None,
                    model_name=selected_model
                )

                st.markdown(response_data["answer"])

                if response_data.get("citations"):
                    with st.expander("📚 Sources & References (SEBI & RBI)", expanded=True):
                        for c in response_data["citations"]:
                            page_txt = f" • Page {c['page']}" if c.get("page") else ""
                            st.markdown(f"""
                            <div class="citation-card">
                                <strong>{c['title']}</strong> <span class="badge-pill badge-rbi">{c['org']}</span>{page_txt}<br>
                                <a href="{c['url']}" target="_blank" style="color: #2DD4BF; text-decoration: none; font-size: 0.8rem;">Open Verified Document ↗</a>
                            </div>
                            """, unsafe_allow_html=True)

                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response_data["answer"],
                    "citations": response_data.get("citations", [])
                })


# ==============================================================================
# PAGE 2: FINANCIAL CALCULATORS
# ==============================================================================
elif selected_page == "🧮 Financial Calculators":
    st.markdown('<div class="hero-title">🧮 Deterministic Financial Calculators</div>', unsafe_allow_html=True)
    st.markdown('<div class="hero-subtitle">Mathematical, verifiable calculations with zero AI hallucination. Exact formulas, steps, and Indian Rupee metrics.</div>', unsafe_allow_html=True)

    calc_tab1, calc_tab2, calc_tab3, calc_tab4, calc_tab5, calc_tab6 = st.tabs([
        "💳 Loan EMI",
        "📈 Compound Interest",
        "💰 Simple Interest",
        "📊 50/30/20 Budget",
        "🎯 Savings Rate",
        "📉 Inflation Impact"
    ])

    # 1. LOAN EMI
    with calc_tab1:
        st.markdown("#### 💳 Loan EMI & Amortization Breakdown")
        c_l, c_r = st.columns([1, 1.2])
        with c_l:
            p_emi = st.number_input("Loan Amount (₹):", min_value=1000.0, value=500000.0, step=10000.0, key="emi_p")
            r_emi = st.number_input("Annual Interest Rate (%):", min_value=0.0, value=9.5, step=0.1, key="emi_r")
            t_emi_yrs = st.number_input("Tenure (Years):", min_value=0.5, value=5.0, step=0.5, key="emi_t")
            n_emi_months = int(t_emi_yrs * 12)

        res_emi = ft.calculate_emi(p_emi, r_emi, n_emi_months)
        with c_r:
            if res_emi["success"]:
                m1, m2 = st.columns(2)
                with m1:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Monthly EMI</div>
                        <div class="metric-value">₹{res_emi['monthly_emi']:,.2f}</div>
                        <div class="metric-subtext">Per month for {n_emi_months} mos</div>
                    </div>
                    """, unsafe_allow_html=True)
                with m2:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Total Interest Cost</div>
                        <div class="metric-value">₹{res_emi['total_interest_payable']:,.2f}</div>
                        <div class="metric-subtext">{res_emi['interest_to_principal_ratio_pct']}% of loan principal</div>
                    </div>
                    """, unsafe_allow_html=True)

                st.markdown(f"""
                <div class="fintech-card" style="margin-top: 14px;">
                    <div style="font-weight: 700; margin-bottom: 6px;">Total Amount Payable: ₹{res_emi['total_amount_payable']:,.2f}</div>
                    <code style="color: #2DD4BF; font-size: 0.85rem;">Formula: {res_emi['formula']}</code>
                    <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 10px;">
                        • Principal Borrowed: ₹{p_emi:,.2f}<br>
                        • Total Interest Payable: ₹{res_emi['total_interest_payable']:,.2f}<br>
                        • Total Payment: ₹{res_emi['total_amount_payable']:,.2f}
                    </div>
                </div>
                """, unsafe_allow_html=True)

    # 2. COMPOUND INTEREST
    with calc_tab2:
        st.markdown("#### 📈 Compound Interest (Wealth Growth)")
        c_l, c_r = st.columns([1, 1.2])
        with c_l:
            p_ci = st.number_input("Principal Invested (₹):", min_value=100.0, value=50000.0, step=5000.0, key="ci_p")
            r_ci = st.number_input("Annual Expected Rate (%):", min_value=0.1, value=11.0, step=0.5, key="ci_r")
            t_ci = st.number_input("Time Period (Years):", min_value=0.5, value=10.0, step=1.0, key="ci_t")
            freq_str = st.selectbox("Compounding Frequency:", ["Annual (1x)", "Semi-Annual (2x)", "Quarterly (4x)", "Monthly (12x)"], key="ci_f")
            freq_map = {"Annual (1x)": 1, "Semi-Annual (2x)": 2, "Quarterly (4x)": 4, "Monthly (12x)": 12}
            freq_val = freq_map[freq_str]

        res_ci = ft.calculate_compound_interest(p_ci, r_ci, t_ci, freq_val)
        with c_r:
            if res_ci["success"]:
                m1, m2 = st.columns(2)
                with m1:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Future Maturity Amount</div>
                        <div class="metric-value">₹{res_ci['total_amount']:,.2f}</div>
                        <div class="metric-subtext">{res_ci['compounding_frequency']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                with m2:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Compound Interest Earned</div>
                        <div class="metric-value">₹{res_ci['interest_earned']:,.2f}</div>
                        <div class="metric-subtext">+{(res_ci['interest_earned']/p_ci)*100:.1f}% gain on principal</div>
                    </div>
                    """, unsafe_allow_html=True)

                st.markdown(f"""
                <div class="fintech-card" style="margin-top: 14px;">
                    <code style="color: #2DD4BF; font-size: 0.85rem;">Formula: {res_ci['formula']}</code>
                    <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 10px;">
                        • Initial Deposit: ₹{p_ci:,.2f}<br>
                        • Total Compounding Periods: {freq_val * t_ci:.0f}<br>
                        • Final Maturity Value: ₹{res_ci['total_amount']:,.2f}
                    </div>
                </div>
                """, unsafe_allow_html=True)

    # 3. SIMPLE INTEREST
    with calc_tab3:
        st.markdown("#### 💰 Simple Interest (Fixed Deposits / Promissory Notes)")
        c_l, c_r = st.columns([1, 1.2])
        with c_l:
            p_si = st.number_input("Principal (₹):", min_value=100.0, value=25000.0, step=1000.0, key="si_p")
            r_si = st.number_input("Annual Interest Rate (%):", min_value=0.0, value=7.25, step=0.25, key="si_r")
            t_si = st.number_input("Duration (Years):", min_value=0.1, value=3.0, step=0.5, key="si_t")

        res_si = ft.calculate_simple_interest(p_si, r_si, t_si)
        with c_r:
            if res_si["success"]:
                m1, m2 = st.columns(2)
                with m1:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Total Simple Interest</div>
                        <div class="metric-value">₹{res_si['interest_earned']:,.2f}</div>
                        <div class="metric-subtext">Over {t_si} years</div>
                    </div>
                    """, unsafe_allow_html=True)
                with m2:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Total Maturity Amount</div>
                        <div class="metric-value">₹{res_si['total_amount']:,.2f}</div>
                        <div class="metric-subtext">Principal + Interest</div>
                    </div>
                    """, unsafe_allow_html=True)

    # 4. 50/30/20 BUDGET
    with calc_tab4:
        st.markdown("#### 📊 50/30/20 Monthly Budget Allocator")
        income_budget = st.number_input("Monthly Net Take-Home Income (₹):", min_value=1000.0, value=45000.0, step=2500.0, key="b_inc")
        res_budget = ft.calculate_budget_50_30_20(income_budget)

        if res_budget["success"]:
            b1, b2, b3 = st.columns(3)
            with b1:
                st.markdown(f"""
                <div class="metric-container">
                    <div class="metric-label">50% Needs (Essentials)</div>
                    <div class="metric-value">₹{res_budget['needs_50']['amount']:,.2f}</div>
                    <div class="metric-subtext">Rent, Groceries, Utilities, EMIs</div>
                </div>
                """, unsafe_allow_html=True)
            with b2:
                st.markdown(f"""
                <div class="metric-container">
                    <div class="metric-label">30% Wants (Discretionary)</div>
                    <div class="metric-value">₹{res_budget['wants_30']['amount']:,.2f}</div>
                    <div class="metric-subtext">Dining, Hobbies, Subscriptions</div>
                </div>
                """, unsafe_allow_html=True)
            with b3:
                st.markdown(f"""
                <div class="metric-container">
                    <div class="metric-label">20% Savings & Debt Cushion</div>
                    <div class="metric-value">₹{res_budget['savings_20']['amount']:,.2f}</div>
                    <div class="metric-subtext">Emergency Fund, SIPs, Prepayments</div>
                </div>
                """, unsafe_allow_html=True)

    # 5. SAVINGS RATE
    with calc_tab5:
        st.markdown("#### 🎯 Personal Savings Rate Benchmark")
        c_l, c_r = st.columns(2)
        with c_l:
            sr_inc = st.number_input("Monthly Income (₹):", min_value=1000.0, value=60000.0, step=2500.0, key="sr_inc")
            sr_sav = st.number_input("Monthly Savings (₹):", min_value=0.0, value=18000.0, step=1000.0, key="sr_sav")

        res_sr = ft.calculate_savings_rate(sr_inc, sr_sav)
        with c_r:
            if res_sr["success"]:
                st.markdown(f"""
                <div class="metric-container">
                    <div class="metric-label">Your Savings Rate</div>
                    <div class="metric-value">{res_sr['savings_rate_pct']}%</div>
                    <div class="metric-subtext">{res_sr['health_rating']}</div>
                </div>
                """, unsafe_allow_html=True)

    # 6. INFLATION IMPACT
    with calc_tab6:
        st.markdown("#### 📉 Inflation & Purchasing Power Erosion")
        c_l, c_r = st.columns([1, 1.2])
        with c_l:
            inf_amt = st.number_input("Present Monthly Expenses / Basket (₹):", min_value=500.0, value=50000.0, step=5000.0, key="inf_a")
            inf_rate = st.number_input("Annual Inflation Rate (%):", min_value=0.0, value=5.5, step=0.1, key="inf_r")
            inf_yrs = st.number_input("Horizon (Years):", min_value=1, value=10, step=1, key="inf_y")

        res_inf = ft.calculate_inflation_impact(inf_amt, inf_rate, inf_yrs)
        with c_r:
            if res_inf["success"]:
                m1, m2 = st.columns(2)
                with m1:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Future Cost of Same Basket</div>
                        <div class="metric-value">₹{res_inf['future_cost_of_basket']:,.2f}</div>
                        <div class="metric-subtext">Needs +{(res_inf['future_cost_of_basket']/inf_amt - 1)*100:.1f}% more capital</div>
                    </div>
                    """, unsafe_allow_html=True)
                with m2:
                    st.markdown(f"""
                    <div class="metric-container">
                        <div class="metric-label">Purchasing Power Retained</div>
                        <div class="metric-value">₹{res_inf['retained_purchasing_power']:,.2f}</div>
                        <div class="metric-subtext" style="color: #F87171;">Lost {res_inf['purchasing_power_loss_pct']}% real value</div>
                    </div>
                    """, unsafe_allow_html=True)


# ==============================================================================
# PAGE 3: KNOWLEDGE BASE
# ==============================================================================
elif selected_page == "📚 Knowledge Base":
    st.markdown('<div class="hero-title">📚 Knowledge Base & Document Index</div>', unsafe_allow_html=True)
    st.markdown('<div class="hero-subtitle">Verifiable regulatory corpus indexed from official public publications. Traceable provenance with page-level citations.</div>', unsafe_allow_html=True)

    # KPI Telemetry
    k1, k2, k3, k4 = st.columns(4)
    with k1:
        st.markdown(f"""
        <div class="metric-container">
            <div class="metric-label">Official Sources</div>
            <div class="metric-value">{kb_stats['num_sources']}</div>
            <div class="metric-subtext">Verified SEBI & RBI</div>
        </div>
        """, unsafe_allow_html=True)
    with k2:
        st.markdown(f"""
        <div class="metric-container">
            <div class="metric-label">Processed Files</div>
            <div class="metric-value">{kb_stats['num_processed_files']}</div>
            <div class="metric-subtext">Cleaned text corpus</div>
        </div>
        """, unsafe_allow_html=True)
    with k3:
        st.markdown(f"""
        <div class="metric-container">
            <div class="metric-label">Searchable Chunks</div>
            <div class="metric-value">{kb_stats['num_chunks']}</div>
            <div class="metric-subtext">Indexed passage windows</div>
        </div>
        """, unsafe_allow_html=True)
    with k4:
        st.markdown(f"""
        <div class="metric-container">
            <div class="metric-label">Processed Size</div>
            <div class="metric-value">{kb_stats['processed_size_kb']} KB</div>
            <div class="metric-subtext">Ultra-compact storage</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # Rebuild Index Control
    c_btn, c_note = st.columns([1, 3])
    with c_btn:
        if st.button("🔄 Rebuild Local Index", use_container_width=True):
            with st.spinner("Reindexing corpus chunks..."):
                new_stats = rebuild_vector_index()
                st.success(f"Index refreshed! {new_stats['num_chunks']} passages ready.")
                st.rerun()
    with c_note:
        st.caption("Rebuilds inverted term indices from all files in `data/processed/` without altering underlying raw documents.")

    st.markdown("---")

    # Document Upload Section
    st.markdown("#### 📤 Upload Educational Material")
    st.caption("Upload additional permitted financial literacy leaflets or booklets (PDF or TXT, max 2 MB).")

    uploaded_doc = st.file_uploader("Upload Leaflet:", type=["pdf", "txt"], label_visibility="collapsed")
    if uploaded_doc is not None:
        doc_size_kb = len(uploaded_doc.getvalue()) / 1024
        if doc_size_kb > 2048:
            st.error("File exceeds 2 MB limit to preserve local storage.")
        else:
            if st.button("Index Uploaded Document", use_container_width=False):
                with st.spinner("Extracting, cleaning, and indexing..."):
                    extracted_text = ""
                    if uploaded_doc.name.endswith(".pdf"):
                        import pypdf
                        reader = pypdf.PdfReader(uploaded_doc)
                        pages = [p.extract_text() or "" for p in reader.pages]
                        extracted_text = "\n\n".join(pages)
                    else:
                        extracted_text = uploaded_doc.getvalue().decode("utf-8", errors="replace")

                    cleaned = clean_text(extracted_text)
                    if len(cleaned) > 80:
                        target = Path("data/processed") / f"custom_{uploaded_doc.name}.txt"
                        target.write_text(cleaned, encoding="utf-8")
                        rebuild_vector_index()
                        st.success(f"Document `{uploaded_doc.name}` indexed successfully into knowledge base!")
                        st.rerun()
                    else:
                        st.warning("Extracted text was too short (<80 characters).")

    st.markdown("---")

    # Detailed Document Catalog
    st.markdown("#### 📑 Indexed Document Catalog")
    for doc in kb_stats.get("sources", []):
        with st.expander(f"📄 {doc['title']} ({doc['org']})"):
            c_d1, c_d2 = st.columns([2, 1])
            with c_d1:
                st.write(f"**Regulatory Body:** {doc['org']}")
                st.write(f"**Topics Covered:** {', '.join(doc['topics'])}")
                st.write(f"**Permitted License:** {doc['license']}")
                st.markdown(f"**Official Portal Link:** [{doc['url']}]({doc['url']})")
            with c_d2:
                st.write(f"**Retrieved Date:** `{doc['retrieved_date']}`")
                st.write(f"**Publication Date:** `{doc['publication_date']}`")
                st.write(f"**Extracted Size:** `{doc['processed_size_bytes'] / 1024:.1f} KB`")
                st.markdown('<span class="badge-pill badge-connected">● Verified Ingested</span>', unsafe_allow_html=True)


# ==============================================================================
# PAGE 4: OFFICIAL SOURCES
# ==============================================================================
elif selected_page == "🏛️ Official Sources":
    st.markdown('<div class="hero-title">🏛️ Official Regulatory Portals & References</div>', unsafe_allow_html=True)
    st.markdown('<div class="hero-subtitle">All financial education resources in FinanceGPT India originate from public awareness initiatives by the RBI and SEBI.</div>', unsafe_allow_html=True)

    col_rbi, col_sebi = st.columns(2)

    with col_rbi:
        st.markdown("""
        <div class="fintech-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-weight: 700; font-size: 1.1rem; color: #F8FAFC;">Reserve Bank of India (RBI)</div>
                <span class="badge-pill badge-rbi">Banking & Digital</span>
            </div>
            <div style="font-size: 0.88rem; color: #CBD5E1; line-height: 1.6;">
                Central bank of India governing currency issuance, banking regulation, monetary policy, and digital payment infrastructure.
            </div>
            <hr style="border-color: rgba(255,255,255,0.06); margin: 12px 0;">
            <div style="font-size: 0.84rem; color: #94A3B8;">
                • <strong>Integrated Ombudsman Scheme (RB-IOS):</strong> Dispute resolution portal for banks, NBFCs, and UPI wallets.<br>
                • <strong>DigiSaathi Helpline (14431 / 1800-891-3333):</strong> 24x7 payment assistance helpline.<br>
                • <strong>BE(A)WARE Booklet:</strong> Modus operandi of financial frauds and digital hygiene.<br>
                • <strong>Monetary Policy Aggregates:</strong> CPI inflation targeting (4% +/- 2%) & Policy Repo Rate.
            </div>
            <div style="margin-top: 16px;">
                <a href="https://www.rbi.org.in" target="_blank" style="color: #38BDF8; font-weight: 600; text-decoration: none; font-size: 0.88rem;">Open Official RBI Portal ↗</a>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with col_sebi:
        st.markdown("""
        <div class="fintech-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-weight: 700; font-size: 1.1rem; color: #F8FAFC;">Securities and Exchange Board of India</div>
                <span class="badge-pill badge-sebi">Capital Markets</span>
            </div>
            <div style="font-size: 0.88rem; color: #CBD5E1; line-height: 1.6;">
                Apex securities market regulator protecting retail investors and regulating stock exchanges, mutual funds, and intermediaries.
            </div>
            <hr style="border-color: rgba(255,255,255,0.06); margin: 12px 0;">
            <div style="font-size: 0.84rem; color: #94A3B8;">
                • <strong>Investor Education & Protection Fund (IPEF):</strong> Booklets on mutual funds and beginner investing.<br>
                • <strong>Primary Markets Guide:</strong> IPO allotment, bidding, and offer documents.<br>
                • <strong>Secondary Markets Guide:</strong> Demat account safeguards, trading settlement cycles.<br>
                • <strong>Investor Advisory Protection:</strong> Identifying unregistered Telegram tipsters and Ponzi schemes.
            </div>
            <div style="margin-top: 16px;">
                <a href="https://investor.sebi.gov.in" target="_blank" style="color: #C084FC; font-weight: 600; text-decoration: none; font-size: 0.88rem;">Open Official SEBI Investor Portal ↗</a>
            </div>
        </div>
        """, unsafe_allow_html=True)

    # Regulatory Portals Directory
    st.markdown("#### 🔗 Directory of Official Public Portals")
    for doc in kb_stats.get("sources", []):
        st.markdown(f"""
        <div class="citation-card" style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>{doc['title']}</strong><br>
                    <span style="font-size: 0.8rem; color: #94A3B8;">{doc['org']} • Topics: {', '.join(doc['topics'])}</span>
                </div>
                <a href="{doc['url']}" target="_blank" style="color: #2DD4BF; text-decoration: none; font-weight: 600; font-size: 0.84rem;">View Source ↗</a>
            </div>
        </div>
        """, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# 6. Persistent Legal & Educational Disclaimer Footer
# ------------------------------------------------------------------------------
st.markdown("---")
st.markdown(f"""
<div style="font-size: 0.78rem; color: #64748B; text-align: center; line-height: 1.5; padding-bottom: 20px;">
    ⚖️ <strong>Regulatory Notice:</strong> FinanceGPT India is an educational demonstration developed by <strong>Gagan Gowda BM</strong> (24UG00204, BCA, Chanakya University).
    It does not provide personalized investment advice, guaranteed profit estimates, or research analyst reports. Consult a SEBI-registered professional before making financial commitments.
</div>
""", unsafe_allow_html=True)
