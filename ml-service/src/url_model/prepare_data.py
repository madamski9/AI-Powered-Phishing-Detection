#!/usr/bin/env python3
"""
Merge Tranco Top-1M legitimate URLs into the processed training dataset.

Reads:   data/urls/raw/top-1m.csv
         data/urls/processed/phishing_urls_processed.csv  (existing features)
Writes:  data/urls/processed/phishing_urls_processed.csv  (updated)

Usage:
    python3.11 prepare_data.py                  # top 100k domains, both variants
    python3.11 prepare_data.py --limit 50000    # fewer domains
    python3.11 prepare_data.py --fresh          # rebuild from raw phishing CSV too
"""

import argparse
import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.url_model.preprocess import URLPreprocessor

SCRIPT_DIR = Path(__file__).parent
ML_ROOT = SCRIPT_DIR.parent.parent
DATA_DIR = ML_ROOT / "data" / "urls"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_PATH = DATA_DIR / "processed" / "phishing_urls_processed.csv"
TRANCO_PATH = RAW_DIR / "top-1m.csv"
PHISHING_RAW_PATH = RAW_DIR / "phishing_site_urls.csv"


def process_urls(urls: list[str], preprocessor: URLPreprocessor, label: int, desc: str) -> pd.DataFrame:
    total = len(urls)
    features = []
    t0 = time.time()

    for i, url in enumerate(urls):
        features.append(preprocessor._extract_url_features(url))
        if (i + 1) % 2000 == 0 or (i + 1) == total:
            elapsed = time.time() - t0
            rate = (i + 1) / elapsed
            remaining = (total - i - 1) / rate
            print(
                f"  [{desc}] {i+1:>7,}/{total:,} "
                f"({(i+1)/total*100:.1f}%)  "
                f"~{remaining/60:.1f} min left       ",
                end="\r",
                flush=True,
            )

    print()
    df = pd.DataFrame(features)
    df["Label"] = label
    return df


def build_legitimate_urls(domains: list[str]) -> list[str]:
    urls = []
    for domain in domains:
        urls.append(f"https://{domain}")
        urls.append(f"https://www.{domain}")
    return urls


def main() -> None:
    parser = argparse.ArgumentParser(description="Merge Tranco legitimate URLs into training data")
    parser.add_argument(
        "--limit",
        type=int,
        default=100_000,
        help="Number of Tranco domains to use (default: 100 000 → ~200k URLs)",
    )
    parser.add_argument(
        "--fresh",
        action="store_true",
        help="Rebuild from raw phishing CSV instead of appending to existing processed data",
    )
    args = parser.parse_args()

    preprocessor = URLPreprocessor("")

    # ------------------------------------------------------------------ #
    # 1. Load or build phishing side
    # ------------------------------------------------------------------ #
    if args.fresh or not PROCESSED_PATH.exists():
        print(f"\nBuilding phishing features from: {PHISHING_RAW_PATH}")
        raw = pd.read_csv(PHISHING_RAW_PATH)
        phishing_urls = raw["URL"].tolist()
        labels_raw = raw["Label"].str.lower().map({"bad": 1, "good": 0}).fillna(0).astype(int).tolist()

        phishing_features = []
        total = len(phishing_urls)
        t0 = time.time()
        for i, url in enumerate(phishing_urls):
            phishing_features.append(preprocessor._extract_url_features(url))
            if (i + 1) % 2000 == 0 or (i + 1) == total:
                elapsed = time.time() - t0
                rate = (i + 1) / elapsed
                remaining = (total - i - 1) / rate
                print(f"  [phishing raw] {i+1:>7,}/{total:,} (~{remaining/60:.1f} min left)  ", end="\r", flush=True)
        print()

        existing = pd.DataFrame(phishing_features)
        existing["Label"] = labels_raw
    else:
        print(f"\nLoading existing processed data: {PROCESSED_PATH}")
        existing = pd.read_csv(PROCESSED_PATH)
        print(f"  Loaded {len(existing):,} rows  |  phishing={( existing['Label']==1).sum():,}  legit={(existing['Label']==0).sum():,}")

    feature_cols = [c for c in existing.columns if c != "Label"]

    # ------------------------------------------------------------------ #
    # 2. Load Tranco and build legitimate URLs
    # ------------------------------------------------------------------ #
    print(f"\nLoading Tranco top-{args.limit:,} domains from: {TRANCO_PATH}")
    tranco = pd.read_csv(TRANCO_PATH, header=None, names=["rank", "domain"])
    tranco = tranco.head(args.limit)
    legit_urls = build_legitimate_urls(tranco["domain"].tolist())
    print(f"  {len(legit_urls):,} URLs to process ({args.limit:,} domains × 2 variants)")

    # ------------------------------------------------------------------ #
    # 3. Process legitimate URLs
    # ------------------------------------------------------------------ #
    print(f"\nExtracting features (this takes a few minutes)...")
    legit_df = process_urls(legit_urls, preprocessor, label=0, desc="tranco")

    # Align columns to match existing (in case of order differences)
    legit_df = legit_df[feature_cols + ["Label"]]

    # ------------------------------------------------------------------ #
    # 4. Merge & save
    # ------------------------------------------------------------------ #
    combined = pd.concat([existing, legit_df], ignore_index=True)
    combined = combined.sample(frac=1, random_state=42).reset_index(drop=True)  # shuffle

    phishing_n = (combined["Label"] == 1).sum()
    legit_n = (combined["Label"] == 0).sum()

    print(f"\nDataset after merge:")
    print(f"  Phishing  (1): {phishing_n:,}")
    print(f"  Legitimate (0): {legit_n:,}")
    print(f"  Total:          {len(combined):,}")
    print(f"  Ratio:          {legit_n/phishing_n:.2f}:1 (legit:phishing)")

    PROCESSED_PATH.parent.mkdir(parents=True, exist_ok=True)
    combined.to_csv(PROCESSED_PATH, index=False)
    print(f"\nSaved → {PROCESSED_PATH}")
    print("Next step: python3.11 train.py")


if __name__ == "__main__":
    main()
