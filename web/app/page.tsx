"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateEmi,
  calculateBudget503020,
  calculateSavingsRate,
  calculateInflationImpact
} from "@/lib/finance-tools";
import { Citation, DocumentChunk, SourceMetadata } from "@/lib/types";
import rawSources from "@/data/sources_metadata.json";
import { SafeMarkdown } from "@/components/SafeMarkdown";

const sourcesList = Object.values(rawSources) as unknown as SourceMetadata[];

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  citations?: Citation[];
  chunks?: DocumentChunk[];
  isGrounded?: boolean;
  offlineMode?: boolean;
  safetyAction?: string;
}

export default function FinanceGPTApp() {
  const [activeTab, setActiveTab] = useState<"chat" | "calculators" | "corpus" | "sources">("chat");

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "bot",
      text:
        "**Namaste! Welcome to FinanceGPT India.** 🇮🇳\n\n" +
        "I am your financial education assistant, grounded exclusively in official educational publications from the **Reserve Bank of India (RBI)** and the **Securities and Exchange Board of India (SEBI)**.\n\n" +
        "You can ask me questions about:\n" +
        "• **Banking & Digital Payments:** Safe UPI usage, RBI ombudsman process, deposit insurance.\n" +
        "• **Loans & Borrowing:** How EMIs are calculated, reducing interest burdens, responsible credit card use.\n" +
        "• **Budgeting & Savings:** The 50/30/20 rule, emergency funds, inflation protection.\n" +
        "• **Fraud Prevention:** Identifying Ponzi schemes, Telegram tip scams, and protecting OTPs.\n\n" +
        "*Feel free to click any suggested question below or type your own query.*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isGrounded: true
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChunksMessageId, setExpandedChunksMessageId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Health / Telemetry State
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean;
    sourcesCount: number;
    chunksCount: number;
  }>({
    configured: false,
    sourcesCount: 10,
    chunksCount: 335
  });

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        if (data?.ai_status) {
          setApiStatus({
            configured: Boolean(data.ai_status.configured),
            sourcesCount: data.corpus?.sources_count || 10,
            chunksCount: data.corpus?.chunks_count || 335
          });
        }
      })
      .catch(() => {
        // Fallback default state
      });
  }, []);

  useEffect(() => {
    if (activeTab === "chat") {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInputQuery("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-err-${Date.now()}`,
            sender: "bot",
            text: `⚠️ ${data.error || "Unable to reach the server. Please try again."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
        return;
      }

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: data.answer || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: data.citations || [],
        chunks: data.retrieved_chunks || [],
        isGrounded: data.is_grounded,
        offlineMode: data.offline_mode,
        safetyAction: data.safety_action
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "bot",
          text: "⚠️ Network connectivity issue. Please check your internet connection.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculator State
  const [calcTab, setCalcTab] = useState<"si" | "ci" | "emi" | "budget" | "savings" | "inflation">("emi");

  // Simple Interest State
  const [siPrincipal, setSiPrincipal] = useState<number>(100000);
  const [siRate, setSiRate] = useState<number>(7.5);
  const [siYears, setSiYears] = useState<number>(3);

  // Compound Interest State
  const [ciPrincipal, setCiPrincipal] = useState<number>(100000);
  const [ciRate, setCiRate] = useState<number>(8.0);
  const [ciYears, setCiYears] = useState<number>(5);
  const [ciFreq, setCiFreq] = useState<number>(1);

  // EMI State
  const [emiPrincipal, setEmiPrincipal] = useState<number>(500000);
  const [emiRate, setEmiRate] = useState<number>(9.5);
  const [emiYears, setEmiYears] = useState<number>(5);

  // Budget State
  const [budgetIncome, setBudgetIncome] = useState<number>(60000);

  // Savings Rate State
  const [savingsIncome, setSavingsIncome] = useState<number>(60000);
  const [savingsAmount, setSavingsAmount] = useState<number>(18000);

  // Inflation State
  const [inflationCorpus, setInflationCorpus] = useState<number>(500000);
  const [inflationRate, setInflationRate] = useState<number>(6.0);
  const [inflationYears, setInflationYears] = useState<number>(10);

  // Knowledge base filter
  const [corpusFilter, setCorpusFilter] = useState<string>("ALL");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border-subtle)",
          backgroundColor: "rgba(12, 21, 39, 0.9)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0.85rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem"
          }}
        >
          {/* Logo & Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #14b8a6 0%, #0369a1 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "#ffffff",
                boxShadow: "0 0 15px rgba(20, 184, 166, 0.4)"
              }}
            >
              ₹
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h1 style={{ fontSize: "1.15rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#ffffff" }}>
                  FinanceGPT <span style={{ color: "var(--accent-teal)" }}>India</span>
                </h1>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.15rem 0.45rem",
                    borderRadius: 4,
                    background: "rgba(20, 184, 166, 0.15)",
                    color: "var(--accent-teal)",
                    fontWeight: 600,
                    border: "1px solid rgba(20, 184, 166, 0.3)"
                  }}
                >
                  v2.0 • VERCEL
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Official RBI & SEBI Grounded Financial Education Engine
              </p>
            </div>
          </div>

          {/* Status & Student Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.3rem 0.65rem",
                borderRadius: 20,
                background: "rgba(17, 29, 53, 0.8)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.72rem",
                color: "var(--text-secondary)"
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: apiStatus.configured ? "var(--accent-emerald)" : "var(--accent-amber)",
                  display: "inline-block"
                }}
              />
              {apiStatus.configured ? "Server AI Active" : "Knowledge Base Grounded"}
            </div>

            <div
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: 20,
                background: "rgba(30, 46, 74, 0.6)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.72rem",
                color: "var(--text-secondary)"
              }}
            >
              Chanakya Univ • Gagan Gowda BM
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-secondary)" }}>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: "0 1.25rem",
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto"
            }}
          >
            {[
              { id: "chat", label: "💬 Financial AI Assistant" },
              { id: "calculators", label: "🧮 Financial Calculators" },
              { id: "corpus", label: `📚 Knowledge Base (${apiStatus.chunksCount} Chunks)` },
              { id: "sources", label: "🏛️ Official RBI & SEBI Portals" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                style={{
                  padding: "0.7rem 1rem",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === tab.id ? "2px solid var(--accent-teal)" : "2px solid transparent",
                  color: activeTab === tab.id ? "var(--text-accent)" : "var(--text-secondary)",
                  fontWeight: activeTab === tab.id ? 600 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "1.25rem" }}>
        {/* TAB 1: CHAT INTERFACE */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)", minHeight: 550 }}>
            {/* Suggested Prompts Pill Row */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                paddingBottom: "0.75rem",
                marginBottom: "0.5rem"
              }}
            >
              {[
                "How does EMI work and how to reduce total interest?",
                "Explain the 50/30/20 budgeting rule",
                "What is the difference between Simple Interest and Compound Interest?",
                "What are SEBI's warnings on Telegram stock tip groups?",
                "How do I file a complaint with the RBI Banking Ombudsman?"
              ].map((query, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(query)}
                  disabled={isLoading}
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: 20,
                    backgroundColor: "rgba(17, 29, 53, 0.6)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-teal)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }}
                >
                  ⚡ {query}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1rem",
                backgroundColor: "rgba(12, 21, 39, 0.4)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem"
              }}
            >
              {messages.map((msg) => {
                const isUser = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className="animate-fade-in"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                      maxWidth: "100%"
                    }}
                  >
                    {/* Header info */}
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.25rem",
                        padding: "0 0.5rem"
                      }}
                    >
                      {isUser ? "You" : "FinanceGPT Assistant"} • {msg.timestamp}
                    </div>

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: isUser ? "80%" : "90%",
                        padding: "1rem 1.25rem",
                        borderRadius: "var(--radius-lg)",
                        backgroundColor: isUser ? "#0e3a35" : "var(--bg-card)",
                        border: isUser ? "1px solid rgba(20, 184, 166, 0.4)" : "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "0.92rem",
                        lineHeight: 1.6,
                        boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
                      }}
                    >
                      {/* Safety badge if triggered */}
                      {msg.safetyAction === "BLOCK_CREDENTIAL" && (
                        <div
                          style={{
                            padding: "0.4rem 0.75rem",
                            marginBottom: "0.75rem",
                            borderRadius: 6,
                            backgroundColor: "rgba(244, 63, 94, 0.15)",
                            border: "1px solid var(--accent-rose)",
                            color: "#fda4af",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          🛡️ Sensitive Credential Interception Active
                        </div>
                      )}

                      {msg.safetyAction === "SCAM_ALERT" && (
                        <div
                          style={{
                            padding: "0.4rem 0.75rem",
                            marginBottom: "0.75rem",
                            borderRadius: 6,
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            border: "1px solid var(--accent-amber)",
                            color: "#fde68a",
                            fontSize: "0.8rem",
                            fontWeight: 600
                          }}
                        >
                          ⚠️ Fraud & Scam Precaution Notice Attached
                        </div>
                      )}

                      {/* Message Content formatted with safe Markdown */}
                      <SafeMarkdown content={msg.text} />

                      {/* Official Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div
                          style={{
                            marginTop: "1rem",
                            paddingTop: "0.75rem",
                            borderTop: "1px solid var(--border-subtle)"
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--accent-teal)",
                              marginBottom: "0.4rem"
                            }}
                          >
                            🏛️ Official Grounding Citations:
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {msg.citations.map((cite, idx) => (
                              <a
                                key={idx}
                                href={cite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: 4,
                                  backgroundColor: "rgba(20, 184, 166, 0.1)",
                                  border: "1px solid rgba(20, 184, 166, 0.25)",
                                  color: "var(--text-accent)",
                                  fontSize: "0.75rem",
                                  textDecoration: "none",
                                  transition: "background 0.15s ease"
                                }}
                              >
                                🔗 {cite.title} ({cite.org}) {cite.page ? `• Page ${cite.page}` : ""}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Retrieved Passages Drawer Toggle */}
                      {msg.chunks && msg.chunks.length > 0 && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <button
                            onClick={() =>
                              setExpandedChunksMessageId(
                                expandedChunksMessageId === msg.id ? null : msg.id
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem"
                            }}
                          >
                            {expandedChunksMessageId === msg.id ? "▲ Hide" : "▼ Inspect"} {msg.chunks.length} verified passage(s) retrieved from corpus
                          </button>

                          {expandedChunksMessageId === msg.id && (
                            <div
                              style={{
                                marginTop: "0.5rem",
                                padding: "0.75rem",
                                borderRadius: 6,
                                backgroundColor: "rgba(7, 13, 24, 0.7)",
                                border: "1px solid var(--border-subtle)",
                                fontSize: "0.78rem"
                              }}
                            >
                              {msg.chunks.map((chk, cIdx) => (
                                <div
                                  key={cIdx}
                                  style={{
                                    marginBottom: cIdx < (msg.chunks?.length || 0) - 1 ? "0.75rem" : 0,
                                    paddingBottom: cIdx < (msg.chunks?.length || 0) - 1 ? "0.75rem" : 0,
                                    borderBottom:
                                      cIdx < (msg.chunks?.length || 0) - 1
                                        ? "1px dashed var(--border-subtle)"
                                        : "none"
                                  }}
                                >
                                  <div style={{ fontWeight: 600, color: "var(--accent-teal)" }}>
                                    #{cIdx + 1}: {chk.document_title} ({chk.source_org})
                                    {chk.relevance_score ? ` • Match: ${chk.relevance_score}` : ""}
                                  </div>
                                  <p style={{ marginTop: "0.25rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                                    &quot;{chk.text.slice(0, 220)}...&quot;
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem" }}>
                  <div className="pulse-indicator" style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--accent-teal)" }} />
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Retrieving verified RBI & SEBI passages and synthesizing grounded guidance...
                  </span>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{
                marginTop: "0.85rem",
                display: "flex",
                gap: "0.5rem",
                alignItems: "center"
              }}
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                maxLength={1000}
                placeholder="Ask any personal finance, loan, or investment education question..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "0.85rem 1.15rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-input)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.92rem",
                  outline: "none"
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-teal)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
              />

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !inputQuery.trim()}
                style={{ height: 46 }}
              >
                {isLoading ? "Consulting..." : "Send Query"}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: FINANCIAL CALCULATORS */}
        {activeTab === "calculators" && (
          <div>
            {/* Sub-selector for calculators */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                overflowX: "auto",
                marginBottom: "1.25rem",
                paddingBottom: "0.5rem"
              }}
            >
              {[
                { id: "emi", label: "🏠 Loan EMI & Repayment" },
                { id: "ci", label: "📈 Compound Interest" },
                { id: "si", label: "💰 Simple Interest" },
                { id: "budget", label: "📊 50/30/20 Budget" },
                { id: "savings", label: "🎯 Savings Rate Health" },
                { id: "inflation", label: "📉 Inflation Impact" }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCalcTab(c.id as typeof calcTab)}
                  className={calcTab === c.id ? "btn-primary" : "btn-secondary"}
                  style={{ fontSize: "0.82rem" }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* EMI CALCULATOR */}
            {calcTab === "emi" && (() => {
              const tenureMonths = Math.round(emiYears * 12);
              const res = calculateEmi(emiPrincipal, emiRate, tenureMonths);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>
                      Loan Parameters
                    </h3>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Loan Amount (Principal): ₹{emiPrincipal.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={10000}
                        max={10000000}
                        step={10000}
                        value={emiPrincipal}
                        onChange={(e) => setEmiPrincipal(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Annual Interest Rate: {emiRate}%
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={25}
                        step={0.1}
                        value={emiRate}
                        onChange={(e) => setEmiRate(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Loan Tenure: {emiYears} Years ({emiYears * 12} Months)
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={emiYears}
                        onChange={(e) => setEmiYears(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>
                      Repayment Summary
                    </h3>

                    {res.success && (
                      <div>
                        <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 8, marginBottom: "1rem", textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Monthly EMI Payment</div>
                          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-teal)" }}>
                            ₹{res.monthly_emi?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                          <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Total Interest</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-amber)" }}>
                              ₹{res.total_interest_payable?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: 6 }}>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Total Repayment</div>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                              ₹{res.total_amount_payable?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                          Interest to Principal Ratio: <strong>{res.interest_to_principal_ratio_pct}%</strong>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
                          {res.disclaimer}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* COMPOUND INTEREST */}
            {calcTab === "ci" && (() => {
              const res = calculateCompoundInterest(ciPrincipal, ciRate, ciYears, ciFreq);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>
                      Investment Inputs
                    </h3>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Principal Invested: ₹{ciPrincipal.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={5000}
                        max={5000000}
                        step={5000}
                        value={ciPrincipal}
                        onChange={(e) => setCiPrincipal(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Annual Return/Rate: {ciRate}%
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={0.25}
                        value={ciRate}
                        onChange={(e) => setCiRate(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Time Horizon: {ciYears} Years
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={40}
                        step={1}
                        value={ciYears}
                        onChange={(e) => setCiYears(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>

                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Compounding Frequency
                      </label>
                      <select
                        value={ciFreq}
                        onChange={(e) => setCiFreq(Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: 6,
                          backgroundColor: "var(--bg-input)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)"
                        }}
                      >
                        <option value={1}>Annual (Once a year)</option>
                        <option value={2}>Semi-Annual (Twice a year)</option>
                        <option value={4}>Quarterly (4 times a year)</option>
                        <option value={12}>Monthly (12 times a year)</option>
                      </select>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>
                      Compounding Result
                    </h3>

                    {res.success && (
                      <div>
                        <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 8, marginBottom: "1rem", textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Maturity Value</div>
                          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
                            ₹{res.total_amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-secondary)", borderRadius: 6, marginBottom: "1rem" }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Compound Interest Earned</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-teal)" }}>
                            ₹{res.interest_earned?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{res.disclaimer}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SIMPLE INTEREST */}
            {calcTab === "si" && (() => {
              const res = calculateSimpleInterest(siPrincipal, siRate, siYears);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Deposit Parameters</h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Deposit (Principal): ₹{siPrincipal.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={5000}
                        max={2000000}
                        step={5000}
                        value={siPrincipal}
                        onChange={(e) => setSiPrincipal(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Rate: {siRate}%
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={18}
                        step={0.1}
                        value={siRate}
                        onChange={(e) => setSiRate(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Time: {siYears} Years
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={1}
                        value={siYears}
                        onChange={(e) => setSiYears(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Simple Interest Result</h3>
                    {res.success && (
                      <div>
                        <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 8, marginBottom: "1rem", textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Total Maturity Amount</div>
                          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-teal)" }}>
                            ₹{res.total_amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                          Interest Accrued: <strong>₹{res.interest_earned?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{res.disclaimer}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 50/30/20 BUDGET */}
            {calcTab === "budget" && (() => {
              const res = calculateBudget503020(budgetIncome);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Monthly Net Take-Home</h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Monthly Income: ₹{budgetIncome.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={10000}
                        max={500000}
                        step={5000}
                        value={budgetIncome}
                        onChange={(e) => setBudgetIncome(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Recommended 50/30/20 Allocation</h3>
                    {res.success && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        <div style={{ padding: "0.75rem", backgroundColor: "rgba(59, 130, 246, 0.15)", borderRadius: 6, border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                          <div style={{ fontSize: "0.75rem", color: "#93c5fd" }}>50% Needs (Rent, Utilities, Food)</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#bfdbfe" }}>
                            ₹{res.needs_50?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div style={{ padding: "0.75rem", backgroundColor: "rgba(245, 158, 11, 0.15)", borderRadius: 6, border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                          <div style={{ fontSize: "0.75rem", color: "#fcd34d" }}>30% Wants (Dining, Gadgets, Leisure)</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fde68a" }}>
                            ₹{res.wants_30?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div style={{ padding: "0.75rem", backgroundColor: "rgba(16, 185, 129, 0.15)", borderRadius: 6, border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                          <div style={{ fontSize: "0.75rem", color: "#6ee7b7" }}>20% Savings & Debt Repayment</div>
                          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#a7f3d0" }}>
                            ₹{res.savings_20?.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SAVINGS RATE */}
            {calcTab === "savings" && (() => {
              const res = calculateSavingsRate(savingsIncome, savingsAmount);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Monthly Finances</h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Monthly Income: ₹{savingsIncome.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={10000}
                        max={500000}
                        step={5000}
                        value={savingsIncome}
                        onChange={(e) => setSavingsIncome(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Monthly Savings: ₹{savingsAmount.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={savingsIncome}
                        step={1000}
                        value={savingsAmount}
                        onChange={(e) => setSavingsAmount(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Savings Health Rating</h3>
                    {res.success && (
                      <div>
                        <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 8, marginBottom: "1rem", textAlign: "center" }}>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Savings Rate</div>
                          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-teal)" }}>
                            {res.savings_rate_pct}%
                          </div>
                          <div style={{ marginTop: "0.4rem", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                            {res.health_rating}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* INFLATION */}
            {calcTab === "inflation" && (() => {
              const res = calculateInflationImpact(inflationCorpus, inflationRate, inflationYears);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Inflation Horizon</h3>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Present Corpus: ₹{inflationCorpus.toLocaleString("en-IN")}
                      </label>
                      <input
                        type="range"
                        min={10000}
                        max={10000000}
                        step={50000}
                        value={inflationCorpus}
                        onChange={(e) => setInflationCorpus(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Annual Inflation Rate: {inflationRate}%
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={0.2}
                        value={inflationRate}
                        onChange={(e) => setInflationRate(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "block", fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                        Years into Future: {inflationYears} Years
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={30}
                        step={1}
                        value={inflationYears}
                        onChange={(e) => setInflationYears(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--accent-teal)" }}
                      />
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", color: "var(--accent-teal)" }}>Purchasing Power Erosion</h3>
                    {res.success && (
                      <div>
                        <div style={{ padding: "1rem", backgroundColor: "var(--bg-secondary)", borderRadius: 8, marginBottom: "1rem" }}>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Retained Real Value in {inflationYears} Yrs</div>
                          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent-rose)" }}>
                            ₹{res.retained_purchasing_power?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--accent-amber)", marginTop: "0.25rem" }}>
                            Purchasing Power Loss: <strong>-{res.purchasing_power_loss_pct}%</strong>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{res.disclaimer}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: KNOWLEDGE BASE CATALOG */}
        {activeTab === "corpus" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>Official Knowledge Base Documents</h2>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Curated publications from Reserve Bank of India (RBI) and Securities and Exchange Board of India (SEBI).
                </p>
              </div>

              {/* Filter */}
              <div style={{ display: "flex", gap: "0.4rem" }}>
                {["ALL", "RBI", "SEBI"].map((org) => (
                  <button
                    key={org}
                    onClick={() => setCorpusFilter(org)}
                    className={corpusFilter === org ? "btn-primary" : "btn-secondary"}
                    style={{ fontSize: "0.75rem", padding: "0.4rem 0.75rem" }}
                  >
                    {org === "ALL" ? "All Sources" : org}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
              {sourcesList
                .filter((s) => corpusFilter === "ALL" || s.source_org.toUpperCase().includes(corpusFilter))
                .map((src) => (
                  <div key={src.id} className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "0.2rem 0.5rem",
                            borderRadius: 4,
                            backgroundColor: src.source_org.includes("RBI") ? "rgba(59, 130, 246, 0.15)" : "rgba(20, 184, 166, 0.15)",
                            color: src.source_org.includes("RBI") ? "#93c5fd" : "var(--accent-teal)",
                            fontWeight: 600
                          }}
                        >
                          {src.source_org}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {Math.round(src.char_count / 1000)}k chars
                        </span>
                      </div>

                      <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                        {src.title}
                      </h3>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.75rem" }}>
                        {src.topics.map((t, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "0.68rem",
                              padding: "0.15rem 0.45rem",
                              borderRadius: 4,
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              color: "var(--text-secondary)"
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ fontSize: "0.75rem", justifyContent: "center", textDecoration: "none" }}
                    >
                      🔗 Open Official Source
                    </a>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 4: OFFICIAL PORTALS */}
        {activeTab === "sources" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>Official Indian Regulatory Portals</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Always verify regulatory guidelines, file complaints, or check credentials through authorized government portals.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
              {[
                {
                  title: "Reserve Bank of India (RBI)",
                  url: "https://www.rbi.org.in",
                  badge: "Banking Regulator",
                  desc: "Apex banking authority. Guidelines on digital payments, bank lockers, loan regulations, and deposit insurance."
                },
                {
                  title: "SEBI Investor Portal",
                  url: "https://investor.sebi.gov.in",
                  badge: "Securities Regulator",
                  desc: "Securities and Exchange Board of India official education portal. Warnings on Ponzi schemes, unregistered finfluencers, and mutual fund basics."
                },
                {
                  title: "RBI Complaint Management System (CMS)",
                  url: "https://cms.rbi.org.in",
                  badge: "Banking Ombudsman",
                  desc: "File complaints against banks, NBFCs, or payment system operators. National Ombudsman Helpline: 14448."
                },
                {
                  title: "National Cyber Crime Reporting Portal",
                  url: "https://cybercrime.gov.in",
                  badge: "Cyber Fraud Helpline",
                  desc: "Report unauthorized financial transactions, UPI fraud, and cyber extortion immediately. National Helpline: 1930."
                },
                {
                  title: "SEBI SCORES Grievance Portal",
                  url: "https://scores.sebi.gov.in",
                  badge: "Investor Grievances",
                  desc: "Platform to lodge complaints against listed companies, brokers, depositories, and registered intermediaries."
                },
                {
                  title: "NISM Financial Literacy",
                  url: "https://www.nism.ac.in",
                  badge: "Educational Institute",
                  desc: "National Institute of Securities Markets established by SEBI for investor education and capacity building."
                }
              ].map((portal, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.2rem 0.5rem",
                        borderRadius: 4,
                        backgroundColor: "rgba(20, 184, 166, 0.15)",
                        color: "var(--accent-teal)",
                        fontWeight: 600,
                        display: "inline-block",
                        marginBottom: "0.5rem"
                      }}
                    >
                      {portal.badge}
                    </span>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                      {portal.title}
                    </h3>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                      {portal.desc}
                    </p>
                  </div>
                  <a
                    href={portal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", justifyContent: "center", textDecoration: "none" }}
                  >
                    Visit {portal.url.replace("https://", "")} ↗
                  </a>
                </div>
              ))}
            </div>

            {/* Fraud Checklist */}
            <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid var(--accent-amber)" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-amber)", marginBottom: "0.5rem" }}>
                🛡️ Golden Rules for Online Financial Safety (RBI & SEBI)
              </h3>
              <ul style={{ paddingLeft: "1.25rem", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                <li><strong>Never Share OTP or PIN:</strong> No bank official, RBI representative, or police officer will ever ask for your OTP or UPI PIN.</li>
                <li><strong>UPI PIN is ONLY for Paying:</strong> You NEVER need to enter your UPI PIN to <em>receive</em> money.</li>
                <li><strong>No Guaranteed Market Profits:</strong> SEBI rules prohibit guaranteed returns. Treat any &quot;100% risk-free 5% daily profit&quot; scheme as a fraud.</li>
                <li><strong>Report within 3 Days:</strong> Zero liability applies if unauthorized electronic banking transactions are reported within 3 days.</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-secondary)",
          padding: "1.25rem",
          marginTop: "auto"
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <strong>FinanceGPT India</strong> • Academic Project Developed by{" "}
              <span style={{ color: "var(--text-primary)" }}>Gagan Gowda BM (24UG00204)</span>, BCA, Chanakya University.
            </div>
            <div>Powered by Next.js & Server-Side Vercel API Architecture</div>
          </div>
          <div>
            ⚖️ <strong>Regulatory Disclaimer:</strong> FinanceGPT India is an educational demonstration project. It is not registered as an Investment Adviser (RIA) or Research Analyst with SEBI or RBI. Information is for conceptual financial literacy only and does not constitute financial, legal, or investment advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
