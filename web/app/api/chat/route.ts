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
      "You are FinanceGPT India, a beginner-friendly, highly accurate financial education chatbot " +
      "developed by Gagan Gowda BM (BCA student, Chanakya University).\n" +
      "Your role is to educate users on personal finance, banking, loans, investments, and fraud prevention in India.\n\n" +
      "STRICT GROUNDING RULES:\n" +
      "1. Base your answer ONLY on the provided official SEBI and RBI educational context below.\n" +
      "2. Do not invent stock prices, specific interest rates, or investment returns.\n" +
      "3. Emphasize risks and explain financial terms in simple, structured bullet points.\n" +
      "4. Always mention the source organization (SEBI or RBI) supporting your explanation.\n" +
      "5. If context is insufficient, state honestly that the dataset lacks details and guide users to official portals.\n" +
      "6. Do not provide personalized investment recommendations or buy/sell calls.";

    const promptPayload = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\n\nOfficial Context:\n${contextBlocks}\n\nUser Question: ${message}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    };

    // Use Gemini 2.5 Flash via REST endpoint
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const geminiRes = await fetch(geminiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promptPayload),
      cache: "no-store"
    });

    if (!geminiRes.ok) {
      // Graceful fallback without exposing keys
      const errorStatus = geminiRes.status;
      let offlineSummary =
        `ℹ️ **AI Service Status Notice (${errorStatus}):** The server encountered a temporary upstream response while generating synthesized text.\n\n` +
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

    const geminiData = await geminiRes.json();
    let generatedText =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Information retrieved from official documents.";

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
