import { DocumentChunk, Citation, SourceMetadata } from "./types";
import rawChunks from "../data/chunks_cache.json";
import rawSources from "../data/sources_metadata.json";

export const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "cannot", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
  "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "its", "itself", "let's", "me", "more",
  "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so", "some", "such", "than",
  "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these", "they", "this",
  "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "were",
  "weren't", "what", "when", "where", "which", "while", "who", "whom", "why", "with", "won't", "would",
  "you", "your", "yours", "yourself", "yourselves", "via", "tell", "explain", "please"
]);

export class LightweightRetriever {
  private k1: number;
  private b: number;
  private chunks: DocumentChunk[];
  private docLengths: number[] = [];
  private docFreqs: Map<string, number> = new Map();
  private avgDocLen: number = 0;
  private totalDocs: number = 0;
  private isIndexed: boolean = false;

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.chunks = rawChunks as unknown as DocumentChunk[];
    this.buildIndex();
  }

  public tokenize(text: string): string[] {
    const clean = (text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
    return clean
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
  }

  private buildIndex(): void {
    if (!this.chunks || this.chunks.length === 0) {
      this.isIndexed = false;
      return;
    }

    this.totalDocs = this.chunks.length;
    this.docLengths = [];
    this.docFreqs.clear();

    for (let i = 0; i < this.totalDocs; i++) {
      const chunk = this.chunks[i];
      const topicsStr = (chunk.topics || []).join(" ");
      const fullText = `${chunk.document_title || ""} ${topicsStr} ${chunk.text || ""}`;
      const tokens = this.tokenize(fullText);
      this.docLengths.push(tokens.length);

      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach((term) => {
        this.docFreqs.set(term, (this.docFreqs.get(term) || 0) + 1);
      });
    }

    const sumLengths = this.docLengths.reduce((acc, len) => acc + len, 0);
    this.avgDocLen = sumLengths / Math.max(1, this.totalDocs);
    this.isIndexed = true;
  }

  public retrieve(query: string, topK: number = 4): DocumentChunk[] {
    if (!this.isIndexed || this.chunks.length === 0) {
      return [];
    }

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return [];
    }

    const scores: number[] = new Array(this.totalDocs).fill(0);
    const matchedTermCounts: number[] = new Array(this.totalDocs).fill(0);

    for (const term of queryTokens) {
      const df = this.docFreqs.get(term);
      if (!df) continue;

      // BM25 IDF formula with smoothing matching Python implementation
      const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1.0);

      for (let i = 0; i < this.totalDocs; i++) {
        const chunk = this.chunks[i];
        const topicsStr = (chunk.topics || []).join(" ");
        const fullText = `${chunk.document_title || ""} ${topicsStr} ${chunk.text || ""}`.toLowerCase();
        
        // Count exact occurrences of term
        const regex = new RegExp(`\\b${term}\\b`, "g");
        const matches = fullText.match(regex);
        const tf = matches ? matches.length : 0;

        if (tf > 0) {
          const docLen = this.docLengths[i];
          const denom = tf + this.k1 * (1.0 - this.b + this.b * (docLen / Math.max(1, this.avgDocLen)));
          const score = idf * (tf * (this.k1 + 1.0)) / Math.max(0.001, denom);
          scores[i] += score;
          matchedTermCounts[i] += 1;
        }
      }
    }

    const minTermsRequired = queryTokens.length >= 3 ? 2 : 1;

    // Rank indices descending by score
    const rankedIndices = Array.from({ length: this.totalDocs }, (_, i) => i)
      .sort((a, b) => scores[b] - scores[a]);

    const topResults: DocumentChunk[] = [];
    for (const idx of rankedIndices) {
      if (topResults.length >= topK) break;
      if (scores[idx] > 0.4 && matchedTermCounts[idx] >= minTermsRequired) {
        const chunk = { ...this.chunks[idx] };
        chunk.relevance_score = Math.round(scores[idx] * 1000) / 1000;
        topResults.push(chunk);
      }
    }

    return topResults;
  }

  public getAllSources(): SourceMetadata[] {
    return Object.values(rawSources) as unknown as SourceMetadata[];
  }

  public getStats() {
    const sourcesList = Object.values(rawSources);
    return {
      total_chunks: this.chunks.length,
      total_sources: sourcesList.length,
      avg_doc_len: Math.round(this.avgDocLen),
      corpus_kb: 198
    };
  }
}

export const retrieverInstance = new LightweightRetriever();

export function retrieveContext(query: string, topK: number = 4): DocumentChunk[] {
  return retrieverInstance.retrieve(query, topK);
}

export function buildCitations(chunks: DocumentChunk[]): Citation[] {
  const citations: Citation[] = [];
  const seenUrls = new Set<string>();

  for (const c of chunks) {
    const url = c.source_url || "";
    if (url && !seenUrls.has(url)) {
      seenUrls.add(url);
      citations.push({
        title: c.document_title || "Official Financial Document",
        org: c.source_org || "Official Authority",
        url: url,
        page: c.page_number ?? null
      });
    }
  }

  return citations;
}
