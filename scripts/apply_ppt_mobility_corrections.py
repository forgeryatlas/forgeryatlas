"""Apply the Crime Mobility / Beyoglu PPT corrections (May 2026).

The second batch of PPT slides delivered on 11 May 2026 targeted:

  1. The Crime Mobility map (powered by ``data/events.json``):
       * fill in missing years on "Unknown" steps;
       * delete a handful of mis-attributed events;
       * add a small number of new events;
       * change one event's year (Angelo Gennari's Crimea piece moves from
         1858 to 1854 so it sorts to the start of his timeline).
  2. The Beyoglu-Pera "Social Interactions" map: drop the French
     ``Rue <number>:`` prefix from each address so the popups read cleanly
     against the (German) Scheda 1869 overlay.
  3. The shared ``formatDate`` helper in ``static/js/mapUtils.js``: remove
     the numeric ``-month[-day]`` suffix so popups display only the year.

The corrections are encoded below so the operation is idempotent and
re-runnable. Each correction names the criminal explicitly (rather than the
event id) so future re-ingestions from the source spreadsheets still apply
cleanly.

Run from the repo root:
    .venv/bin/python scripts/apply_ppt_mobility_corrections.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENTS_PATH = ROOT / "data" / "events.json"
CRIMINALS_PATH = ROOT / "data" / "criminals.json"
BEYOGLU_PATH = ROOT / "static" / "js" / "beyogluMapOverlay.js"
MAPUTILS_PATH = ROOT / "static" / "js" / "mapUtils.js"


# (criminalName, eventType, locationName) -> {year, action}
# action: "set" (default), "delete"
# A trailing ``#N`` lets us disambiguate when a criminal has several events
# matching the same (type, location) – the index is the 1-based occurrence in
# events.json order.
CORRECTIONS: list[dict] = [
    # ----- Alexandre Venanzi (criminal_0) -----
    {"crim": "Alexandre Venanzi", "type": "forgery", "loc": "Istanbul", "year": 1857},

    # ----- Antonietta Biancardi Pandolfini (criminal_2) -----
    {"crim": "Antonietta Biancardi Pandolfini", "type": "arrest", "loc": "Turin", "year": 1858},

    # ----- Augustine Mayner Veiller (criminal_3) -----
    {"crim": "Augustine Mayner Veiller", "type": "forgery", "loc": "Turin", "year": 1857},
    {"crim": "Augustine Mayner Veiller", "type": "forgery", "loc": "Istanbul", "year": 1857},

    # ----- Spadafora Filippo Peppo (criminal_4) -----
    {"crim": "Spadafora Filippo Peppo", "type": "forgery", "loc": "Turin", "year": 1857},
    {"crim": "Spadafora Filippo Peppo", "type": "forgery", "loc": "Istanbul", "year": 1857},
    {"crim": "Spadafora Filippo Peppo", "type": "escape", "loc": "Sweden", "year": 1857},

    # ----- Dimitri Calvocoressi (criminal_5) -----
    {"crim": "Dimitri Calvocoressi", "type": "forgery", "loc": "Sardinia", "year": 1857},
    {"crim": "Dimitri Calvocoressi", "type": "forgery", "loc": "Turin", "year": 1857},

    # ----- Marcello Bresciani (criminal_6) -----
    {"crim": "Marcello Bresciani", "type": "forgery", "loc": "Turin", "year": 1857},

    # ----- Ambrose Bondesio (criminal_7) -----
    {"crim": "Ambrose Bondesio", "type": "forgery", "loc": "Turin", "year": 1857},
    {"crim": "Ambrose Bondesio", "type": "forgery", "loc": "Genoa", "year": 1857},

    # ----- Raffele Crudeli (criminal_11) -----
    # Delete the Crimea forgery — PPT notes "Bilgi hatası mevcut".
    {"crim": "Raffele Crudeli", "type": "forgery", "loc": "Crimea", "action": "delete"},
    {"crim": "Raffele Crudeli", "type": "forgery", "loc": "Bologna", "year": 1858},
    {"crim": "Raffele Crudeli", "type": "forgery", "loc": "Istanbul", "year": 1858},

    # ----- Andonaki Draganicos (criminal_14) -----
    {"crim": "Andonaki Draganicos", "type": "forgery", "loc": "Bologna", "year": 1857},

    # ----- Guglielmo Thumb (criminal_20) -----
    {"crim": "Guglielmo Thumb", "type": "forgery", "loc": "Bologna", "year": 1858},

    # ----- Angelo Gennari (criminal_21) -----
    # Existing Crimea piece moves to 1854 so it sorts to the timeline start.
    {"crim": "Angelo Gennari", "type": "forgery", "loc": "Crimea", "year": 1854},
    {"crim": "Angelo Gennari", "type": "forgery", "loc": "Istanbul", "year": 1857},
    {"crim": "Angelo Gennari", "type": "forgery", "loc": "London", "action": "delete"},
    {"crim": "Angelo Gennari", "type": "arrest", "loc": "Venice", "year": 1858},

    # ----- Gaetano Manzo (criminal_23) -----
    {"crim": "Gaetano Manzo", "type": "arrest", "loc": "Istanbul", "year": 1859},

    # ----- Clitzi Cole (criminal_24) -----
    {"crim": "Clitzi Cole", "type": "arrest", "loc": "Istanbul", "year": 1859},

    # ----- Nito (criminal_25) -----
    {"crim": "Nito", "type": "arrest", "loc": "Istanbul", "year": 1859},

    # ----- Enrico Corti (criminal_35) -----
    {"crim": "Enrico Corti", "type": "forgery", "loc": "Bologna", "year": 1858},
    {"crim": "Enrico Corti", "type": "forgery", "loc": "Istanbul", "year": 1858},
]


# New events to add. Coordinates and locationName mirror the existing
# entries for each city so the map can render them without code changes.
ADDITIONS: list[dict] = [
    # Enrico Corti — 1859 Istanbul Arrest
    {
        "crim": "Enrico Corti",
        "type": "arrest",
        "year": 1859,
        "locationName": "Istanbul",
        "lat": 41.0082,
        "lng": 28.9784,
        "description": "Arrested in Istanbul in 1859",
    },
    # Roberto Diamanti — 1855 Crimea Forgery
    {
        "crim": "Roberto Diamanti",
        "type": "forgery",
        "year": 1855,
        "locationName": "Crimea",
        "lat": 45.0,
        "lng": 34.0,
        "description": "Forgery committed in Crimea in 1855",
    },
    # Roberto Diamanti — 1858 Istanbul Forgery
    {
        "crim": "Roberto Diamanti",
        "type": "forgery",
        "year": 1858,
        "locationName": "Istanbul",
        "lat": 41.0082,
        "lng": 28.9784,
        "description": "Forgery committed in Istanbul in 1858",
    },
    # Raffele Randaboschi — 1858 Bologna Forgery
    {
        "crim": "Raffele Randaboschi",
        "type": "forgery",
        "year": 1858,
        "locationName": "Bologna",
        "lat": 44.4949,
        "lng": 11.3426,
        "description": "Forgery committed in Bologna in 1858",
    },
]


def _strip_date_suffix(text: str) -> str:
    """Drop trailing ``(YYYY[-M[-D]])`` / "in YYYY-M[-D]" markers from a
    description so the result reads naturally under the new year-only
    convention."""
    if not text:
        return text
    text = re.sub(r"\s*\((\d{4})(?:-\d{1,2}){1,2}\)\s*$", r" (\1)", text)
    text = re.sub(r"\s*in\s+(\d{4})-\d{1,2}(?:-\d{1,2})?\s*$", r" in \1", text)
    return text


def patch_events() -> None:
    crims = json.loads(CRIMINALS_PATH.read_text(encoding="utf-8"))
    name_to_id = {c["name"]: c["id"] for c in crims}

    events = json.loads(EVENTS_PATH.read_text(encoding="utf-8"))

    # Index events by (criminalId, type, locationName) preserving order so
    # repeated lookups for the same key consume entries one-at-a-time.
    by_key: dict[tuple, list[dict]] = {}
    for e in events:
        key = (e["criminalId"], e.get("type"), e.get("locationName"))
        by_key.setdefault(key, []).append(e)

    used_per_key: dict[tuple, int] = {}
    to_delete: set[str] = set()

    for fix in CORRECTIONS:
        cid = name_to_id.get(fix["crim"])
        if not cid:
            print(f"[warn] criminal not found: {fix['crim']!r}; skipping")
            continue
        key = (cid, fix["type"], fix["loc"])
        bucket = by_key.get(key)
        if not bucket:
            print(f"[warn] no event for {fix['crim']} / {fix['type']} / {fix['loc']}")
            continue
        idx = used_per_key.get(key, 0)
        if idx >= len(bucket):
            print(f"[warn] ran out of events for {fix['crim']} / {fix['type']} / {fix['loc']}")
            continue
        evt = bucket[idx]
        used_per_key[key] = idx + 1

        action = fix.get("action", "set")
        if action == "delete":
            to_delete.add(evt["id"])
            continue
        evt["date"]["year"] = fix["year"]
        # Drop any spurious month-level granularity that lingered from the
        # old "YYYY-M" labels. The PPT explicitly asked for year-only.
        evt["date"]["month"] = None
        evt["date"]["day"] = None
        evt["description"] = _strip_date_suffix(evt.get("description") or "")

    # ALSO normalise descriptions / month-day for every other event so the
    # popups all render with year-only formatting. This guarantees the
    # "1857-5", "1858-2" suffixes the PPT highlighted disappear regardless of
    # which event the date came from.
    for e in events:
        if e["id"] in to_delete:
            continue
        e["description"] = _strip_date_suffix(e.get("description") or "")

    if to_delete:
        events = [e for e in events if e["id"] not in to_delete]

    # ---- additions ----
    existing_ids = {int(e["id"].split("_", 1)[1]) for e in events}
    next_id = max(existing_ids) + 1 if existing_ids else 0
    for add in ADDITIONS:
        cid = name_to_id.get(add["crim"])
        if not cid:
            print(f"[warn] addition skipped: {add['crim']!r} not in criminals.json")
            continue
        # Skip duplicates if this script has been run before
        dup = any(
            e["criminalId"] == cid
            and e.get("type") == add["type"]
            and e.get("locationName") == add["locationName"]
            and (e.get("date") or {}).get("year") == add["year"]
            for e in events
        )
        if dup:
            continue
        events.append({
            "id": f"event_{next_id}",
            "criminalId": cid,
            "type": add["type"],
            "date": {"year": add["year"], "month": None, "day": None},
            "location": {"latitude": add["lat"], "longitude": add["lng"]},
            "locationName": add["locationName"],
            "description": add["description"],
        })
        next_id += 1

    EVENTS_PATH.write_text(
        json.dumps(events, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"[events] wrote {EVENTS_PATH} "
        f"({len(events)} events, {len(to_delete)} deletions, "
        f"{len(ADDITIONS)} additions attempted)"
    )


def patch_beyoglu() -> None:
    """Strip ``Rue <number>: `` prefixes from every ``rue: '...'`` literal."""
    text = BEYOGLU_PATH.read_text(encoding="utf-8")
    new_text, n = re.subn(
        r"(rue:\s*')Rue\s+\d+:\s*",
        r"\1",
        text,
    )
    if n:
        BEYOGLU_PATH.write_text(new_text, encoding="utf-8")
    print(f"[beyoglu] stripped 'Rue NNN: ' prefix from {n} entries")


def patch_format_date() -> None:
    """Make the shared formatDate helper render year-only."""
    text = MAPUTILS_PATH.read_text(encoding="utf-8")

    new_block = (
        "function formatDate(date) {\n"
        "    if (!date) return 'Unknown Date';\n"
        "    // Render year-only per the May 2026 PPT correction; the\n"
        "    // numeric month/day suffix (e.g. '1857-5') was not meaningful\n"
        "    // to readers and has been removed.\n"
        "    return (date.year || 'Unknown').toString();\n"
        "}\n"
    )

    new_text, n = re.subn(
        r"function formatDate\(date\) \{[\s\S]*?\n\}\n",
        new_block,
        text,
        count=1,
    )
    if n == 0:
        print("[mapUtils] formatDate not found — please update manually")
        return
    MAPUTILS_PATH.write_text(new_text, encoding="utf-8")
    print(f"[mapUtils] formatDate updated to year-only")


def main() -> None:
    patch_events()
    patch_beyoglu()
    patch_format_date()


if __name__ == "__main__":
    main()
