"""
test_rag.py
===========
Automated tests for retrieval relevance, citation handling, and grounded answers in rag.py.
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University
"""

import pytest
from rag import retrieve_context, generate_grounded_answer, rebuild_vector_index


def test_retriever_financial_terms():
    # Mutual fund search should retrieve mutual fund passages
    results = retrieve_context("What is mutual fund and NAV?", top_k=3)
    assert len(results) > 0
    top_doc = results[0]
    assert "mutual" in top_doc["text"].lower() or "fund" in top_doc["text"].lower() or "nav" in top_doc["text"].lower()
    assert "source_url" in top_doc
    assert "document_title" in top_doc


def test_retriever_banking_ombudsman():
    # Banking ombudsman query should retrieve RBI ombudsman passages
    results = retrieve_context("How do I file a complaint with Banking Ombudsman?", top_k=3)
    assert len(results) > 0
    found_ombudsman = any("ombudsman" in r["text"].lower() for r in results)
    assert found_ombudsman is True


def test_retriever_upi123pay():
    results = retrieve_context("Can I use UPI on feature phone without internet?", top_k=3)
    assert len(results) > 0
    found_upi = any("upi" in r["text"].lower() or "phone" in r["text"].lower() for r in results)
    assert found_upi is True


def test_rag_blocked_credentials():
    # If user inputs a sensitive credential, RAG should block without calling LLM
    res = generate_grounded_answer("My bank card is 4111 2222 3333 4444")
    assert res["safety_action"] == "BLOCK_CREDENTIAL"
    assert res["is_grounded"] is False
    assert "Security Warning" in res["answer"]


def test_rag_missing_or_obscure_topic():
    # Obscure non-financial topic should trigger fallback
    res = generate_grounded_answer("How do quantum black holes evaporate via Hawking radiation?")
    # Either empty results or fallback notification
    assert "I checked the official Indian financial education knowledge base" in res["answer"]
    assert res["is_grounded"] is False


def test_rag_offline_grounding_citations():
    # Even without API key, rag should return relevant excerpts with citations
    res = generate_grounded_answer("Explain primary market and IPO process")
    assert res["is_grounded"] is True
    assert len(res["citations"]) > 0
    assert any("Primary" in c["title"] or "SEBI" in c["org"] for c in res["citations"])
