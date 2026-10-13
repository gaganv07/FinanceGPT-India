import { NextResponse } from "next/server";
import { retrieverInstance } from "@/lib/rag";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = retrieverInstance.getStats();
  const apiKeyConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);

  return NextResponse.json({
    status: "healthy",
    project: "FinanceGPT India",
    developer: "Gagan Gowda BM",
    student_id: "24UG00204",
    university: "Chanakya University",
    corpus: {
      sources_count: stats.total_sources,
      chunks_count: stats.total_chunks,
      storage_kb: stats.corpus_kb
    },
    ai_status: {
      configured: apiKeyConfigured,
      model: "gemini-3.5-flash-lite (fallbacks: gemini-2.0-flash, gemini-1.5-flash)",
      mode: apiKeyConfigured ? "cloud_gemini_active" : "offline_excerpts_active"
    },
    timestamp: new Date().toISOString()
  });
}
