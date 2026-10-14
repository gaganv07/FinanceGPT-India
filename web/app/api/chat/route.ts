import { NextRequest, NextResponse } from "next/server";
import { checkInputSafety, attachDisclaimer } from "@/lib/safety";
import { retrieveContext, buildCitations } from "@/lib/rag";
import { ChatResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

// Basic in-memory abuse protection (sliding rate limiter per IP, 25 requests/min)
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 25;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const clientRecord = rateLimitMap.get(ip);

  if (!clientRecord) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (now - clientRecord.lastReset > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (clientRecord.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  clientRecord.count += 1;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // Abuse protection
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous-client";
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          error: "Too many requests. Please pause for a moment before asking your next financial question.",
          safety_action: "ALLOW"
        },
        { status: 429 }
      );
    }

    // Parse and validate JSON
    let body: { message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const rawMessage = body.message;
    if (typeof rawMessage !== "string" || !rawMessage.trim()) {
      return NextResponse.json(
        { error: "A non-empty 'message' string is required." },
        { status: 400 }
      );
    }

    const message = rawMessage.trim();
    if (message.length > 1000) {
      return NextResponse.json(
        { error: "Question exceeds maximum length of 1,000 characters. Please summarize your query." },
        { status: 400 }
      );
    }

    // Step 1: Input Safety & Credential Guardrail
    const safetyResult = checkInputSafety(message);
    if (!safetyResult.safe && safetyResult.action === "BLOCK_CREDENTIAL") {
      const response: ChatResponse = {
        answer: safetyResult.message,
        citations: [],
        retrieved_chunks: [],
        is_grounded: false,
        safety_action: "BLOCK_CREDENTIAL"
      };
      return NextResponse.json(response);
    }

    // Step 2: Retrieve Top Official Excerpts
    const topChunks = retrieveContext(message, 4);
    const citations = buildCitations(topChunks);

    // If no passages found, honest fallback
    if (!topChunks || topChunks.length === 0) {
      let fallbackMsg =
        "I searched the official Indian financial education knowledge base (SEBI and RBI resources), " +
        "but I do not have enough verified documentation to answer this specific question.\n\n" +
        "To ensure accurate and safe financial guidance:\n" +
        "• Visit the official Reserve Bank of India site: [rbi.org.in](https://www.rbi.org.in)\n" +
        "• Visit the official SEBI Investor portal: [investor.sebi.gov.in](https://investor.sebi.gov.in)\n" +
        "• For banking grievances, use the RBI Ombudsman Portal: [cms.rbi.org.in](https://cms.rbi.org.in) or call **14448**.";

      if (safetyResult.action === "SCAM_ALERT") {
        fallbackMsg = `${safetyResult.message}\n\n${fallbackMsg}`;
      }

      const response: ChatResponse = {
        answer: attachDisclaimer(fallbackMsg),
        citations: [],
        retrieved_chunks: [],
        is_grounded: false,
        safety_action: safetyResult.action
      };
      return NextResponse.json(response);
    }

    // Step 3: Check Server-Side Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.trim() === "") {
      // Offline fallback mode: Return official verified excerpts safely
      let offlineSummary =
        "ℹ️ **Server Notice (Secure Mode):** `GEMINI_API_KEY` is not currently set on the server.\n\n" +
        `Found **${topChunks.length} verified excerpt(s)** directly in the local RBI & SEBI knowledge base:\n\n`;

      for (const c of topChunks) {
        const pageStr = c.page_number ? ` (Page ${c.page_number})` : "";
        offlineSummary += `• **${c.document_title}${pageStr}**:\n>${c.text.slice(0, 300)}...\n\n`;
      }

      if (safetyResult.action === "SCAM_ALERT") {
        offlineSummary = `${safetyResult.message}\n\n${offlineSummary}`;
      }

      const response: ChatResponse = {
        answer: attachDisclaimer(offlineSummary),
        citations: citations,
        retrieved_chunks: topChunks,
        is_grounded: true,
        safety_action: safetyResult.action,
        offline_mode: true
      };
      return NextResponse.json(response);
    }

    // Step 4: Call Google Gemini API from Server
    // Format context blocks
    const contextBlocks = topChunks.map((c, idx) => {
      const pageStr = c.page_number ? `, Page ${c.page_number}` : "";
      return `[Source ${idx + 1}: ${c.document_title} (${c.source_org})${pageStr}]\n${c.text}`;
    }).join("\n\n");

    const systemPrompt =
      "You are FinanceGPT India, an expert Indian financial education assistant grounded in official " +
      "Reserve Bank of India (RBI) and Securities and Exchange Board of India (SEBI) educational materials.\n\n" +
      "RESPONSE STYLE & STRUCTURE RULES:\n" +
      "1. DIRECT ANSWER FIRST: Answer the user's question immediately in the first sentence. Do not include greetings, introductions, or conversational filler like 'Hello, I am FinanceGPT India'.\n" +
      "2. BEGINNER-FRIENDLY DEFINITIONS: Explain every financial concept in plain, simple English suitable for a beginner.\n" +
      "3. PRACTICAL EXAMPLES:\n" +
      "   - For 'Mutual Fund & NAV' questions: Provide a simple definition of Mutual Fund, then a simple definition of NAV (Net Asset Value), followed by an easy real-life example (e.g., pooling ₹5,000 from multiple investors, or showing that NAV = Net Assets ÷ Total Units). Clarify SEBI's rule that a lower NAV does NOT mean a cheaper or better fund.\n" +
      "   - For 'SIP' (Systematic Investment Plan) questions: Explain the meaning (disciplined periodic investing), how it works (rupee-cost averaging and compounding), and give a clear numeric example (e.g., investing ₹1,000 every month).\n" +
      "4. CONCISE & STRUCTURED FORMAT: Use clean Markdown with '### ' for section headers, '**bold**' for key terms, and bullet points ('- ') for readability. Never output raw HTML tags.\n" +
      "5. REGULATORY ATTRIBUTION & RISKS: Clearly state the regulatory body (SEBI or RBI) supporting key rules. Always highlight market risks and emphasize that market investments do not have guaranteed returns.\n" +
      "6. STRICT TRUTHFULNESS: Never invent returns, specific stock tips, or unsupported claims. Ground your answer in the provided context.";

    const promptPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nOfficial Context from SEBI/RBI:\n${contextBlocks}\n\nUser Question: ${message}\n\nProvide a direct, beginner-friendly answer following the structure rules above:`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    // Step 4: Call Google Gemini API from Server
    // Supported models in priority order:
    // 1. gemini-3.5-flash-lite (high-throughput, low-latency Gemini 3 model requested)
    // 2. gemini-2.0-flash (widely available modern production Flash model)
    // 3. gemini-1.5-flash (reliable general availability fallback)
    const CANDIDATE_MODELS = [
      "gemini-3.5-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ];

    let generatedText: string | null = null;
    let lastErrorStatus = 0;
    let lastErrorMessage = "";
    let successfulModel = "";

    for (const model of CANDIDATE_MODELS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(promptPayload),
          cache: "no-store"
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) {
            generatedText = text.trim();
            successfulModel = model;
            console.log(`[Gemini API] Successfully generated answer using model '${model}'.`);
            break;
          }
        } else {
          lastErrorStatus = res.status;
          const errorData = await res.json().catch(() => null);
          const rawMsg = errorData?.error?.message || res.statusText || "Request failed";
          // Redact any potential key or secret from logs
          const safeMsg = String(rawMsg).replace(/([A-Za-z0-9_\-]{20,})/g, "[REDACTED]");
          lastErrorMessage = safeMsg;
          console.warn(`[Gemini API] Model '${model}' failed with HTTP ${res.status}: ${safeMsg}`);
        }
      } catch (fetchErr) {
        const safeFetchErr = String(fetchErr).replace(/([A-Za-z0-9_\-]{20,})/g, "[REDACTED]");
        lastErrorMessage = safeFetchErr;
        console.warn(`[Gemini API] Network error on model '${model}': ${safeFetchErr}`);
      }
    }

    // If all models failed or returned empty, graceful fallback to verified excerpts
    if (!generatedText) {
      const reasonSnippet = lastErrorMessage ? ` (${lastErrorMessage.slice(0, 80)})` : "";
      let offlineSummary =
        `ℹ️ **AI Service Status Notice (HTTP ${lastErrorStatus || "Error"}):** The server encountered a temporary upstream response while generating synthesized text${reasonSnippet}.\n\n` +
        `Displaying verified excerpts directly from the official knowledge base:\n\n`;

      for (const c of topChunks) {
        const pageStr = c.page_number ? ` (Page ${c.page_number})` : "";
        offlineSummary += `• **${c.document_title}${pageStr}**:\n>${c.text.slice(0, 300)}...\n\n`;
      }

      if (safetyResult.action === "SCAM_ALERT") {
        offlineSummary = `${safetyResult.message}\n\n${offlineSummary}`;
      }

      const response: ChatResponse = {
        answer: attachDisclaimer(offlineSummary),
        citations: citations,
        retrieved_chunks: topChunks,
        is_grounded: true,
        safety_action: safetyResult.action,
        offline_mode: true
      };
      return NextResponse.json(response);
    }

    if (safetyResult.action === "SCAM_ALERT") {
      generatedText = `${safetyResult.message}\n\n${generatedText}`;
    }

    const response: ChatResponse = {
      answer: attachDisclaimer(generatedText),
      citations: citations,
      retrieved_chunks: topChunks,
      is_grounded: true,
      safety_action: safetyResult.action
    };

    return NextResponse.json(response);
  } catch (err) {
    // Redact any potential secret in unexpected errors
    const rawError = String(err);
    const safeError = rawError.replace(/([A-Za-z0-9_\-]{16,})/g, "[REDACTED]");
    console.error("Chat API error:", safeError);

    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing your request. Please try again shortly.",
        safety_action: "ALLOW"
      },
      { status: 500 }
    );
  }
}
