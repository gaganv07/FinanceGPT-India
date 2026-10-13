"""
rag.py
======
FinanceGPT India — Lightweight Hybrid Retrieval & Grounded Generation Engine
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University

Combines:
1. Fast, memory-efficient BM25/TF-IDF passage retriever (zero PyTorch bloat).
2. Grounded question answering via Google Gemini API (google-genai).
3. Explicit citations (document title, source organization, official URL, page number).
4. Strict fallback when knowledge base lacks evidence.
"""

import os
import re
import math
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

from data_loader import load_all_chunks, get_dataset_stats
from safety import check_input_safety, attach_disclaimer

BASE_DIR = Path(__file__).resolve().parent
VECTOR_STORE_DIR = BASE_DIR / "vector_store"
CHUNKS_CACHE_FILE = VECTOR_STORE_DIR / "chunks_cache.json"

VECTOR_STORE_DIR.mkdir(parents=True, exist_ok=True)


STOP_WORDS = {
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
}


class LightweightRetriever:
    """
    Lightweight, deterministic BM25-style keyword and semantic ranker.
    Requires 0 GB GPU memory and runs locally without downloading heavy deep-learning weights.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Dict[str, Any]] = []
        self.doc_freqs: Dict[str, int] = {}
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.total_docs: int = 0
        self._is_indexed = False

    def tokenize(self, text: str) -> List[str]:
        """Convert text into normalized lowercase alphanumeric tokens without stop words."""
        clean = re.sub(r'[^a-zA-Z0-9\s]', ' ', text.lower())
        return [t for t in clean.split() if len(t) > 2 and t not in STOP_WORDS]


    def build_index(self, force_reload: bool = False):
        """Loads chunks from cache or processed text, and builds inverted term index."""
        if CHUNKS_CACHE_FILE.exists() and not force_reload:
            try:
                self.chunks = json.loads(CHUNKS_CACHE_FILE.read_text(encoding="utf-8"))
            except Exception:
                self.chunks = load_all_chunks()
        else:
            self.chunks = load_all_chunks()
            if self.chunks:
                CHUNKS_CACHE_FILE.write_text(
                    json.dumps(self.chunks, indent=2, ensure_ascii=False),
                    encoding="utf-8"
                )

        if not self.chunks:
            self._is_indexed = False
            return

        self.total_docs = len(self.chunks)
        self.doc_lengths = []
        self.doc_freqs = {}

        for chunk in self.chunks:
            # Combine title, topics, and body for robust retrieval
            topics_str = " ".join(chunk.get("topics", []))
            full_text = f"{chunk.get('document_title', '')} {topics_str} {chunk.get('text', '')}"
            tokens = self.tokenize(full_text)
            self.doc_lengths.append(len(tokens))
            
            unique_terms = set(tokens)
            for term in unique_terms:
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1

        self.avg_doc_len = sum(self.doc_lengths) / max(1, self.total_docs)
        self._is_indexed = True

    def retrieve(self, query: str, top_k: int = 4) -> List[Dict[str, Any]]:
        """Score all chunks against query tokens using BM25 formula."""
        if not self._is_indexed or not self.chunks:
            self.build_index()

        if not self.chunks:
            return []

        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []

        scores = [0.0] * self.total_docs
        matched_term_counts = [0] * self.total_docs

        for term in query_tokens:
            if term not in self.doc_freqs:
                continue

            # IDF formula with smoothing
            df = self.doc_freqs[term]
            idf = math.log((self.total_docs - df + 0.5) / (df + 0.5) + 1.0)

            for i, chunk in enumerate(self.chunks):
                full_text = f"{chunk.get('document_title', '')} {' '.join(chunk.get('topics', []))} {chunk.get('text', '')}".lower()
                tf = full_text.count(term)
                if tf > 0:
                    doc_len = self.doc_lengths[i]
                    denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / max(1, self.avg_doc_len)))
                    score = idf * (tf * (self.k1 + 1.0)) / max(0.001, denom)
                    scores[i] += score
                    matched_term_counts[i] += 1

        # Rank documents
        min_terms_required = 2 if len(query_tokens) >= 3 else 1
        ranked_indices = sorted(range(len(scores)), key=lambda idx: scores[idx], reverse=True)
        top_results = []
        for idx in ranked_indices[:top_k]:
            if scores[idx] > 0.4 and matched_term_counts[idx] >= min_terms_required:
                chunk_copy = dict(self.chunks[idx])
                chunk_copy["relevance_score"] = round(scores[idx], 3)
                top_results.append(chunk_copy)

        return top_results



# Global retriever instance
retriever_instance = LightweightRetriever()


def retrieve_context(query: str, top_k: int = 4) -> List[Dict[str, Any]]:
    """Convenience helper to retrieve top relevant passages."""
    return retriever_instance.retrieve(query, top_k=top_k)


def rebuild_vector_index() -> Dict[str, Any]:
    """Forces reloading of all processed files and rebuilds index."""
    retriever_instance.build_index(force_reload=True)
    return get_dataset_stats()


def get_gemini_client(api_key: Optional[str] = None):
    """Initializes Google GenAI client from provided key or environment variable."""
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=key)
    except Exception as e:
        print(f"[!] Error instantiating google-genai client: {e}")
        return None


def generate_grounded_answer(
    user_query: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash"
) -> Dict[str, Any]:
    """
    End-to-end RAG response generation:
    1. Runs safety checks (flags credentials, scams).
    2. Retrieves top relevant official documents.
    3. Prompts Google Gemini with strict grounding.
    4. Formats citations with document titles and page numbers.
    """
    # Step 1: Safety & Credential Guardrail
    safety_result = check_input_safety(user_query)
    if not safety_result["safe"] and safety_result["action"] == "BLOCK_CREDENTIAL":
        return {
            "answer": safety_result["message"],
            "citations": [],
            "retrieved_chunks": [],
            "is_grounded": False,
            "safety_action": "BLOCK_CREDENTIAL"
        }

    # Step 2: Retrieve relevant passages
    top_chunks = retrieve_context(user_query, top_k=4)

    # Prepare citations
    citations = []
    context_blocks = []
    seen_urls = set()

    for idx, c in enumerate(top_chunks):
        title = c.get("document_title", "Official Educational Material")
        org = c.get("source_org", "Official Authority")
        url = c.get("source_url", "")
        page = c.get("page_number")
        
        cite_str = f"{title} ({org})"
        if page:
            cite_str += f", Page {page}"
        if url and url not in seen_urls:
            seen_urls.add(url)
            citations.append({
                "title": title,
                "org": org,
                "url": url,
                "page": page
            })

        snippet = f"[Source {idx + 1}: {cite_str}]\n{c.get('text', '')}"
        context_blocks.append(snippet)

    # Step 3: Check if knowledge base contains sufficient context
    if not top_chunks:
        fallback_msg = (
            "I checked the official Indian financial education knowledge base (SEBI and RBI resources), "
            "but I do not have enough verified information to answer this specific question.\n\n"
            "To ensure accurate and safe financial guidance:\n"
            "• Visit the official Reserve Bank of India site: [rbi.org.in](https://www.rbi.org.in)\n"
            "• Visit the official SEBI Investor portal: [investor.sebi.gov.in](https://investor.sebi.gov.in)\n"
            "• For banking grievances, use the RBI Ombudsman Portal: [cms.rbi.org.in](https://cms.rbi.org.in) or call 14448."
        )
        if safety_result.get("action") == "SCAM_ALERT":
            fallback_msg = f"{safety_result['message']}\n\n{fallback_msg}"

        return {
            "answer": attach_disclaimer(fallback_msg),
            "citations": [],
            "retrieved_chunks": [],
            "is_grounded": False,
            "safety_action": safety_result.get("action", "ALLOW")
        }

    combined_context = "\n\n".join(context_blocks)

    # Step 4: Attempt Gemini Answer Generation
    client = get_gemini_client(api_key)

    if not client:
        # Graceful fallback when API key is not yet set
        offline_summary = (
            "⚠️ **API Key Required for AI Generation:**\n\n"
            f"Found **{len(top_chunks)} relevant passage(s)** in the local SEBI/RBI dataset. "
            "To generate AI synthesized responses, please add your `GEMINI_API_KEY` to `.env` or Streamlit Secrets.\n\n"
            "### Relevant Excerpts from Official Documents:\n\n"
        )
        for c in top_chunks:
            p_str = f" (Page {c['page_number']})" if c.get('page_number') else ""
            offline_summary += f"• **{c['document_title']}{p_str}**:\n>{c['text'][:280]}...\n\n"

        if safety_result.get("action") == "SCAM_ALERT":
            offline_summary = f"{safety_result['message']}\n\n{offline_summary}"

        return {
            "answer": attach_disclaimer(offline_summary),
            "citations": citations,
            "retrieved_chunks": top_chunks,
            "is_grounded": True,
            "safety_action": safety_result.get("action", "ALLOW")
        }

    # Construct strict grounded prompt
    system_prompt = (
        "You are FinanceGPT India, a beginner-friendly, highly accurate financial education chatbot "
        "created by Gagan Gowda BM (BCA student, Chanakya University).\n"
        "Your role is to educate users on personal finance, banking, loans, investments, and fraud prevention.\n\n"
        "STRICT GROUNDING RULES:\n"
        "1. Base your answer ONLY on the provided official SEBI and RBI educational context below.\n"
        "2. Do not invent stock prices, specific interest rates, or investment returns.\n"
        "3. Emphasize risks and explain financial terms in simple, structured bullet points.\n"
        "4. Always mention the source organization (SEBI or RBI) supporting your explanation.\n"
        "5. If context is insufficient, state honestly that the dataset lacks details and guide users to official portals.\n"
        "6. Do not provide personalized investment recommendations or buy/sell calls."
    )

    user_prompt = f"Official Context:\n{combined_context}\n\nUser Question: {user_query}"

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[system_prompt, user_prompt]
        )
        generated_text = response.text or ""
        
        # Prepend scam warning if triggered
        if safety_result.get("action") == "SCAM_ALERT":
            generated_text = f"{safety_result['message']}\n\n{generated_text}"

        final_answer = attach_disclaimer(generated_text)
        return {
            "answer": final_answer,
            "citations": citations,
            "retrieved_chunks": top_chunks,
            "is_grounded": True,
            "safety_action": safety_result.get("action", "ALLOW")
        }
    except Exception as e:
        err_str = str(e)
        clean_err = re.sub(r'([A-Za-z0-9_\-]{16,})', '[REDACTED]', err_str)
        error_msg = (
            f"ℹ️ **AI Generation Notice:** Cloud AI service encountered an issue ({clean_err[:90]}).\n\n"
            "Displaying relevant verified excerpts from the official SEBI/RBI knowledge base:\n\n"
        )
        for c in top_chunks:
            p_str = f" (Page {c['page_number']})" if c.get('page_number') else ""
            error_msg += f"• **{c['document_title']}{p_str}**:\n>{c['text'][:280]}...\n\n"
        return {
            "answer": attach_disclaimer(error_msg),

            "citations": citations,
            "retrieved_chunks": top_chunks,
            "is_grounded": True,
            "safety_action": safety_result.get("action", "ALLOW")
        }
