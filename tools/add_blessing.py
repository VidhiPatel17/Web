#!/usr/bin/env python3
"""Add a blessing to the guest book, or export it for Excel.

The wall reads data/blessings.json straight from the repo, so whoever looks after
the site adds wishes here and re-uploads the folder.

    python tools/add_blessing.py "Meera" "May your home always be this loud."
    python tools/add_blessing.py                 # asks for both
    python tools/add_blessing.py --export        # also writes data/blessings.csv

Nothing is sent anywhere; it only edits files next to this script.
"""
import csv
import io
import json
import os
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
JSON_PATH = os.path.join(DATA, "blessings.json")
CSV_PATH = os.path.join(DATA, "blessings.csv")
IST = timezone(timedelta(hours=5, minutes=30))


def load():
    os.makedirs(DATA, exist_ok=True)
    if not os.path.exists(JSON_PATH):
        return {"items": []}
    with io.open(JSON_PATH, encoding="utf-8") as fh:
        raw = json.load(fh)
    if isinstance(raw, list):
        return {"items": raw}
    raw.setdefault("items", [])
    return raw


def save(state):
    with io.open(JSON_PATH, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(state, fh, indent=2, ensure_ascii=False)
        fh.write("\n")


def export_csv(state):
    with io.open(CSV_PATH, "w", encoding="utf-8-sig", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["when", "name", "blessing"])
        for it in state["items"]:
            w.writerow([it.get("when", ""), it.get("name", ""), it.get("wish", "")])
    return CSV_PATH


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    do_export = "--export" in sys.argv

    name = args[0].strip() if len(args) > 0 else input("Name: ").strip()
    wish = args[1].strip() if len(args) > 1 else input("Blessing: ").strip()
    if not name or not wish:
        print("A name and a blessing are both needed.")
        return 1

    state = load()
    state["items"].append({
        "when": datetime.now(IST).strftime("%d %b %Y"),
        "name": name[:40],
        "wish": wish[:200],
    })
    save(state)
    print(f"added \u2014 {len(state['items'])} blessing(s) in the book")

    if do_export:
        print("exported", export_csv(state))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
