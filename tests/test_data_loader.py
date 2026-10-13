"""
test_data_loader.py
===================
Automated tests for dataset loading, metadata preservation, and chunking in data_loader.py.
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University
"""

import pytest
from data_loader import chunk_text, load_all_chunks, get_dataset_stats, load_metadata_manifest, clean_text


def test_clean_text():
    raw_input = "  Policy Repo Rate is 5.50% on 2026-10-01.\r\n\r\n\r\nAmount: ₹1,00,000.\xa0\xa0\x00\x08Website: https://www.rbi.org.in  "
    cleaned = clean_text(raw_input)
    assert cleaned == "Policy Repo Rate is 5.50% on 2026-10-01.\n\nAmount: ₹1,00,000. Website: https://www.rbi.org.in"
    assert clean_text("") == ""
    assert clean_text(None) == ""


def test_chunk_text_basic():
    sample_text = (
        "Mutual funds pool capital from investors.\n\n"
        "They invest across equities, government bonds, and debt.\n\n"
        "A fund manager oversees the portfolio according to scheme objectives."
    )
    chunks = chunk_text(sample_text, chunk_size=200, overlap=50)
    assert len(chunks) >= 1
    assert all(len(c) >= 50 for c in chunks)


def test_chunk_text_empty():
    assert chunk_text("") == []
    assert chunk_text("   \n\n   ") == []



def test_metadata_manifest_exists():
    manifest = load_metadata_manifest()
    assert isinstance(manifest, dict)
    assert len(manifest) >= 5
    # Verify mandatory provenance keys
    for sid, meta in manifest.items():
        assert "title" in meta
        assert "url" in meta
        assert "source_org" in meta
        assert "license" in meta
        assert "topics" in meta


def test_load_all_chunks_has_metadata():
    chunks = load_all_chunks()
    assert len(chunks) > 0
    first = chunks[0]
    assert "chunk_id" in first
    assert "source_id" in first
    assert "document_title" in first
    assert "source_url" in first
    assert "source_org" in first
    assert "text" in first
    assert len(first["text"]) > 0


def test_dataset_stats():
    stats = get_dataset_stats()
    assert stats["num_sources"] >= 5
    assert stats["num_chunks"] > 0
    assert stats["processed_size_kb"] > 0
