#!/usr/bin/env python3
"""Import teachers from CSV into Supabase via the PostgREST REST API.

Requires environment variables:
  - SUPABASE_URL (e.g. https://xyz.supabase.co)
  - SUPABASE_SERVICE_KEY (service role key)

Writes upserts to the `teachers` table using `on_conflict=email`.
"""

import csv
import json
import os
import sys
from typing import List

import httpx


CSV_PATH = os.environ.get("TEACHERS_CSV", "data/teachers_import.csv")


def batch_upsert(supabase_url: str, svc_key: str, rows: List[dict]) -> (bool, str):
    url = supabase_url.rstrip("/") + "/rest/v1/teachers?on_conflict=email"
    headers = {
        "apikey": svc_key,
        "Authorization": f"Bearer {svc_key}",
        "Content-Type": "application/json",
        # Prefer minimal return to reduce payload; change to 'return=representation' to get rows
        "Prefer": "return=minimal",
    }
    try:
        r = httpx.post(url, headers=headers, content=json.dumps(rows), timeout=30.0)
    except Exception as e:
        return False, str(e)
    if r.status_code not in (200, 201, 204):
        return False, f"HTTP {r.status_code}: {r.text}"
    return True, ""


def main():
    supabase_url = os.getenv("SUPABASE_URL")
    svc_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not supabase_url or not svc_key:
        print("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment.")
        sys.exit(2)

    path = CSV_PATH
    if not os.path.exists(path):
        print(f"CSV file not found: {path}")
        sys.exit(1)

    with open(path, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        rows = []
        total = 0
        for row in reader:
            total += 1
            full_name = (row.get("full_name") or "").strip()
            email = (row.get("email") or "").strip() or None
            role = (row.get("role") or "teacher").strip() or "teacher"
            if not full_name:
                print(f"Skipping row {total}: missing full_name")
                continue
            rows.append({"full_name": full_name, "email": email, "role": role})

    if not rows:
        print("No valid rows to import.")
        return

    # Send in batches to avoid very large requests
    batch_size = 50
    total_ok = 0
    total_err = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        ok, msg = batch_upsert(supabase_url, svc_key, batch)
        if ok:
            total_ok += len(batch)
            print(f"Upserted batch {i//batch_size + 1}: {len(batch)} rows")
        else:
            total_err += len(batch)
            print(f"Batch {i//batch_size + 1} failed: {msg}")

    print(f"Done. attempted={len(rows)} ok={total_ok} errors={total_err}")


if __name__ == "__main__":
    main()
