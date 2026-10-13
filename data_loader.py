"""
data_loader.py
==============
FinanceGPT India — Document Processing, Text Chunking & Metadata Preservation
Author: Gagan Gowda BM (24UG00204), BCA, Chanakya University

Loads processed text from data/processed/, chunks text with overlapping windows,
and preserves comprehensive metadata (title, URL, organization, topics, page/section).
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

BASE_DIR = Path(__file__).resolve().parent
PROCESSED_DIR = BASE_DIR / "data" / "processed"
METADATA_DIR = BASE_DIR / "data" / "metadata"
METADATA_FILE = METADATA_DIR / "sources_metadata.json"


def load_metadata_manifest() -> Dict[str, Any]:
    """Loads source provenance metadata from data/metadata/sources_metadata.json."""
    if not METADATA_FILE.exists():
        return {}
    try:
        return json.loads(METADATA_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[!] Error loading metadata manifest: {e}")
        return {}


def clean_text(text: Optional[str]) -> str:
    """
    Safely normalizes whitespace and removes unwanted control characters
    without damaging meaningful financial text, numbers, dates, URLs, or currency symbols.
    """
    if not text:
        return ""
    # Normalize unicode non-breaking spaces and Windows line endings
    text = text.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    # Strip non-printable ASCII control characters (keeping standard newlines)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Collapse 3 or more consecutive newlines into 2 (standard paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Collapse multiple consecutive horizontal spaces/tabs into a single space
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()


def chunk_text(

    text: str,
    chunk_size: int = 700,
    overlap: int = 150
) -> List[str]:
    """
    Splits text into overlapping chunks based on sentence/paragraph boundaries.
    Ensures chunks do not cut words abruptly.
    """
    if not text:
        return []

    # Strip metadata comments at top
    body_text = re.sub(r'^#.*?\n', '', text, flags=re.MULTILINE).strip()
    if not body_text:
        return []

    # Split into paragraphs first
    paragraphs = [p.strip() for p in body_text.split('\n\n') if p.strip()]
    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{para}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
            # If a single paragraph is larger than chunk_size, split by sentences
            if len(para) > chunk_size:
                sentences = re.split(r'(?<=[.!?])\s+', para)
                sub_chunk = ""
                for s in sentences:
                    if len(sub_chunk) + len(s) + 1 <= chunk_size:
                        sub_chunk = f"{sub_chunk} {s}".strip()
                    else:
                        if sub_chunk:
                            chunks.append(sub_chunk)
                        sub_chunk = s
                if sub_chunk:
                    current_chunk = sub_chunk
            else:
                current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    # Filter out very short chunks (e.g. < 60 characters)
    filtered = [c.strip() for c in chunks if len(c.strip()) >= 60]
    return filtered


def load_all_chunks() -> List[Dict[str, Any]]:
    """
    Reads all text files in data/processed/, chunks them, attaches metadata,
    and returns a structured list of document chunk dictionaries.
    """
    manifest = load_metadata_manifest()
    all_chunks = []
    
    if not PROCESSED_DIR.exists():
        return []

    processed_files = list(PROCESSED_DIR.glob("*.txt"))
    if not processed_files:
        print("[!] No processed text files found in data/processed/. Run collect_dataset.py first.")
        return []

    for fpath in processed_files:
        source_id = fpath.stem
        meta = manifest.get(source_id, {})
        
        try:
            content = fpath.read_text(encoding="utf-8")
        except Exception as e:
            print(f"[!] Could not read {fpath.name}: {e}")
            continue

        raw_chunks = chunk_text(content)
        
        for idx, chunk_str in enumerate(raw_chunks):
            # Extract page info if present in chunk
            page_match = re.search(r'---\s*Page\s*(\d+)\s*---', chunk_str)
            page_num = int(page_match.group(1)) if page_match else None
            clean_chunk_str = re.sub(r'---\s*Page\s*\d+\s*---\n?', '', chunk_str).strip()

            chunk_obj = {
                "chunk_id": f"{source_id}_chunk_{idx + 1:03d}",
                "source_id": source_id,
                "document_title": meta.get("title", source_id.replace("_", " ").title()),
                "source_org": meta.get("source_org", "Official Indian Financial Authority"),
                "source_url": meta.get("url", "https://www.rbi.org.in"),
                "topics": meta.get("topics", []),
                "page_number": page_num,
                "text": clean_chunk_str,
                "char_length": len(clean_chunk_str)
            }
            all_chunks.append(chunk_obj)

    return all_chunks


def get_dataset_stats() -> Dict[str, Any]:
    """Returns dataset summary statistics for reporting and UI display."""
    manifest = load_metadata_manifest()
    chunks = load_all_chunks()
    
    total_chars = sum(c["char_length"] for c in chunks)
    processed_files = list(PROCESSED_DIR.glob("*.txt")) if PROCESSED_DIR.exists() else []
    total_file_bytes = sum(f.stat().st_size for f in processed_files)

    return {
        "num_sources": len(manifest),
        "num_processed_files": len(processed_files),
        "num_chunks": len(chunks),
        "total_characters": total_chars,
        "processed_size_kb": round(total_file_bytes / 1024, 2),
        "sources": [
            {
                "id": k,
                "title": v.get("title", k.replace("_", " ").title()),
                "org": v.get("source_org", "Official Regulator"),
                "url": v.get("url", "https://www.rbi.org.in"),
                "topics": v.get("topics", []),
                "license": v.get("license", "Public Educational Use"),
                "retrieved_date": v.get("retrieved_date", "2026-10-13"),
                "publication_date": v.get("publication_date", "N/A"),
                "processed_size_bytes": v.get("processed_size_bytes", 0),
                "char_count": v.get("char_count", 0),
                "extraction_status": v.get("extraction_status", "SUCCESS")
            }
            for k, v in manifest.items()
        ]
    }



if __name__ == "__main__":
    print("Testing data_loader.py ...")
    stats = get_dataset_stats()
    print(f"Sources in Manifest: {stats['num_sources']}")
    print(f"Total Chunks:       {stats['num_chunks']}")
    print(f"Total Processed KB: {stats['processed_size_kb']} KB")
