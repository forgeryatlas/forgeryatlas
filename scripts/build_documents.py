#!/usr/bin/env python3
"""
Build the public document corpus consumed by the Primary Documents pages.

For each diplomatic folder (Diplomasi belgeleri/Dosya N):
  - copies the PDF to documents/diplomatic/<NNN>/original.pdf
  - copies the DOCX to documents/diplomatic/<NNN>/transcription.docx
  - converts the DOCX to documents/diplomatic/<NNN>/transcription.html via mammoth

For each judicial document (declared in JUDICIAL_DOCS below, sourced from
Mahkeme belgeleri/<city folder>):
  - copies into documents/judicial/<city-slug>/<doc-slug>/
  - emits the same {original.pdf, transcription.docx, transcription.html}
    triple

Finally writes:
  - data/diplomatic_documents.json   (140 entries, mapped to communications)
  - data/judicial_documents.json     (curated from Judicial Process Timeline)

Run with the venv that has mammoth installed:
    .venv/bin/python scripts/build_documents.py
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

import mammoth


ROOT = Path(__file__).resolve().parent.parent
DIP_SRC = ROOT / "Diplomasi belgeleri"
JUD_SRC = ROOT / "Mahkeme belgeleri"
DOC_OUT = ROOT / "documents"
DATA_OUT = ROOT / "data"
COMMS_PATH = DATA_OUT / "communications.json"


# Dosya folders whose PDF/DOCX filenames disagree with the actual date
# stated inside the docx (verified by reading the document body).
# Keys are folder names, values are the canonical date the script
# should treat them as (YYYY-MM-DD). The user can extend this as
# additional anomalies are noticed.
DOSYA_DATE_OVERRIDES: dict[str, str] = {
    "Dosya 4":   "1858-02-21",  # filename says 21.02.1859
    "Dosya 28":  "1858-11-01",  # filename says 01.12.1858; body: "1er Novembre 1858"
    "Dosya 68":  "1859-04-27",  # filename says 27.04.1959 (year typo)
    "Dosya 133": "1862-03-20",  # filename says 20.03.1861; body: "20 Mars 1862"
}


# Communications that should not be matched to any folder even if a
# date collision exists. Useful when the user knows a comm has no
# archival document. (Empty by default; auto-mapping handles the rest.)
COMM_SKIP: set[str] = set()


# Mammoth style map keeps headings, lists, blockquotes and bold/italic;
# strips Word's default classnames so the output is small and CSS-able.
MAMMOTH_STYLE_MAP = """
p[style-name='Title'] => h1.transcription-title:fresh
p[style-name='Heading 1'] => h2:fresh
p[style-name='Heading 2'] => h3:fresh
p[style-name='Heading 3'] => h4:fresh
p[style-name='Quote'] => blockquote > p:fresh
p[style-name='Intense Quote'] => blockquote.intense > p:fresh
b => strong
i => em
""".strip()


# --- Judicial documents (from Judicial Process Timeline screenshot) ---
# Each entry is one row of the timeline table. Dates and sessions come
# from that table; PDF / DOCX filenames come from `Mahkeme belgeleri/`.
JUDICIAL_DOCS = [
    {
        "id": "judicial_turin_interrogation",
        "city": "Turin",
        "city_slug": "turin",
        "slug": "interrogation-process",
        "court": "Interrogation Process at criminal prison, Turin",
        "date": "1858-03-31",
        "date_display": "31.03.1858",
        "session": "Records of the Legal Proceedings",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Turin",
        "src_pdf": "Interrogation Process at criminal prison, Turin.pdf",
        "src_docx": "Interrogation Process, Turin.docx",
    },
    {
        "id": "judicial_turin_chamber_council",
        "city": "Turin",
        "city_slug": "turin",
        "slug": "chamber-of-council",
        "court": "The Chamber of Council at the Royal Tribunal of Turin",
        "date": "1858-04-01",
        "date_display": "01.04.1858",
        "session": "Orders that the case be transmitted to the office of the Attorney General",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Turin",
        "src_pdf": "Order of the Chamber of Council at the Royal Tribunal of Turin.pdf",
        "src_docx": "Order of the Chamber of Council at the Royal Tribunal of Turin.docx",
    },
    {
        "id": "judicial_turin_fiscal_advocate",
        "city": "Turin",
        "city_slug": "turin",
        "slug": "fiscal-advocate-general",
        "court": "The Fiscal Advocate General at the Court of Appeal of Turin",
        "date": "1859-01-21",
        "date_display": "21.01.1859",
        "session": "Legal Proceeding",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Turin",
        "src_pdf": "The Fiscal Advocate General at the Court of Appeal of Turin.pdf",
        "src_docx": "The Fiscal Advocate General at the Court of Appeal of Turin.docx",
    },
    {
        "id": "judicial_turin_court_of_appeal",
        "city": "Turin",
        "city_slug": "turin",
        "slug": "court-of-appeal",
        "court": "The Court of Appeal, Turin",
        "date": "1859-02-28",
        "date_display": "28.02.1859 / 01.03.1859",
        "session": "Second Criminal Session and Pronouncement of Sentences",
        "language": "Italian",
        "src_subdir": "Judicial Process, Turin",
        "src_pdf": "The Court of Appeal, Turin.pdf",
        "src_docx": "The Court of Appeal, Turin.docx",
    },
    {
        "id": "judicial_turin_legal_proceeding",
        "city": "Turin",
        "city_slug": "turin",
        "slug": "ministry-of-grace-and-justice",
        "court": "Ministry of Grace and Justice and Ecclesiastical Affairs, Turin",
        "date": "1859-03-01",
        "date_display": "March 1859",
        "session": "Records of the Legal Proceedings",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Turin",
        "src_pdf": "Legal Proceeding, Turin.pdf",
        "src_docx": "Legal Proceeding, Turin.docx",
    },
    {
        "id": "judicial_bologna_collegiate_tribunal",
        "city": "Bologna",
        "city_slug": "bologna",
        "slug": "collegiate-tribunal",
        "court": "Collegiate Tribunal of First Instance, Bologna",
        "date": "1860-01-05",
        "date_display": "05.01.1860 / 13.02.1860",
        "session": "Acts of the Tribunal — Bologna Collegiate Tribunal of First Instance; Official Statement to the Ottoman Government",
        "language": "Italian",
        "src_subdir": "Judicial Process, Bologna",
        "src_pdf": "Bologna, Collegiate Tribunal of First Instance.pdf",
        "src_docx": "Bologna, Collegiate Tribunal of First Instance.docx",
    },
    {
        "id": "judicial_bologna_civil_criminal_court",
        "city": "Bologna",
        "city_slug": "bologna",
        "slug": "civil-and-criminal-court",
        "court": "Civil and Criminal Court of First Instance in Bologna",
        "date": "1860-10-31",
        "date_display": "31.10.1860",
        "session": "Legal Proceeding",
        "language": "Italian",
        "src_subdir": "Judicial Process, Bologna",
        "src_pdf": "Civil and Criminal Court of First Instance in Bologna.pdf",
        "src_docx": "Civil and Criminal Court of First Instance in Bologna.docx",
        "extra_pdfs": ["Civil and Criminal Court of First Instance in Bologna 2.pdf"],
    },
    {
        "id": "judicial_constantinople_criminal_investigative",
        "city": "Constantinople",
        "city_slug": "constantinople",
        "slug": "criminal-investigative-court",
        "court": "The Criminal Investigative Court at the Imperial Ministry of Police, Constantinople",
        "date": "1860-11-30",
        "date_display": "30.11.1860",
        "session": "Records of the Legal Proceedings",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Constantinople",
        "src_pdf": "Minutes of the Criminal Investigative Court at the Imperial Ministry of Police.pdf",
        "src_docx": "Minutes of the Criminal Investigative Court at the Imperial Ministry of Police.docx",
    },
    {
        "id": "judicial_bologna_prosecutor_general",
        "city": "Bologna",
        "city_slug": "bologna",
        "slug": "prosecutor-general-court-of-appeal",
        "court": "Public Prosecutor General, Court of Appeal, Bologna",
        "date": "1861-04-19",
        "date_display": "19.04.1861",
        "session": "Statement concerning the status of civil party",
        "language": "French (copy)",
        "src_subdir": "Judicial Process, Bologna",
        "src_pdf": "Public Report of the Prosecutor General at the Court of Appeal of Bologna.pdf",
        "src_docx": "Public Report of the Prosecutor General at the Court of Appeal of Bologna.docx",
    },
]


# ---------------------- helpers ----------------------

DATE_RE = re.compile(r"(\d{2})\.(\d{2})\.(\d{4})")


def extract_date_from_filename(name: str) -> str | None:
    """Pull DD.MM.YYYY out of a filename and return it as YYYY-MM-DD."""
    m = DATE_RE.search(name)
    if not m:
        return None
    d, mo, y = m.groups()
    return f"{y}-{mo}-{d}"


def docx_to_html(docx_path: Path) -> str:
    with docx_path.open("rb") as fh:
        result = mammoth.convert_to_html(fh, style_map=MAMMOTH_STYLE_MAP)
    body = result.value or ""
    if not body:
        body = '<p class="transcription-empty">(No text extracted from this document.)</p>'
    return body


# Full HTML wrapper for each transcription file. We render it in an iframe
# from the document viewer, so it must be a self-contained page that styles
# its own typography. Fonts come from Google Fonts via @import so the iframe
# does not depend on the parent stylesheet.
TRANSCRIPTION_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang=\"en\">
<head>
<meta charset=\"UTF-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
<title>Transcription</title>
<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">
<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>
<link href=\"https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap\" rel=\"stylesheet\">
<style>
:root {{
    color-scheme: light;
}}
* {{ box-sizing: border-box; }}
html, body {{
    margin: 0;
    padding: 0;
    background: #fffaf1;
}}
body {{
    padding: 24px 28px 40px;
    font-family: \"Playfair Display\", Georgia, serif;
    font-size: 16px;
    line-height: 1.72;
    color: #2c2418;
}}
.transcription {{
    max-width: 64ch;
    margin: 0 auto;
}}
.transcription p {{ margin: 0 0 14px; }}
.transcription p:first-child {{ margin-top: 0; }}
.transcription h1, .transcription h2, .transcription h3, .transcription h4 {{
    font-family: \"Playfair Display\", Georgia, serif;
    color: #1a2a40;
    margin: 28px 0 12px;
}}
.transcription h1 {{ font-size: 1.6rem; }}
.transcription h2 {{ font-size: 1.4rem; }}
.transcription h3 {{ font-size: 1.2rem; }}
.transcription h4 {{ font-size: 1.05rem; }}
.transcription strong {{ color: #4b3a23; }}
.transcription em {{ font-style: italic; }}
.transcription blockquote {{
    border-left: 3px solid #a67b5b;
    padding: 4px 16px;
    margin: 16px 0;
    color: rgba(44, 44, 44, 0.85);
    background: rgba(212, 196, 168, 0.18);
    border-radius: 0 8px 8px 0;
}}
.transcription a {{ color: #4b6455; }}
.transcription-empty {{
    color: rgba(44, 44, 44, 0.6);
    font-style: italic;
}}
</style>
</head>
<body>
<article class=\"transcription\">
{body}
</article>
</body>
</html>
"""


# The English translation portion of every transcribed document begins
# with a paragraph that contains a bolded "Translation" heading (per the
# project's transcription convention). We split there so the viewer can
# offer separate Transcription / Translation views. Multi-letter docs
# that contain several "Translation" headings fall back to splitting at
# the first occurrence (the rest is shown in the Translation pane).
# The regex tolerates incidental whitespace inside the <strong> tag,
# which mammoth occasionally preserves from the source DOCX.
TRANSLATION_MARKER_RE = re.compile(
    r"<p>\s*<strong>\s*Translation\s*</strong>\s*</p>",
    flags=re.IGNORECASE,
)


def _wrap_transcription_page(body_html: str) -> str:
    """Wrap a snippet in the iframe-ready transcription page template."""
    if not body_html or not body_html.strip():
        body_html = '<p class="transcription-empty">(No content available.)</p>'
    return TRANSCRIPTION_PAGE_TEMPLATE.format(body=body_html)


def write_transcription_html(directory: Path, docx_path: Path) -> bool:
    """Convert the docx, split into transcription + translation, and write
    transcription.html (always) and translation.html (when a 'Translation'
    marker is present). Returns True if a translation file was emitted.
    """
    body = docx_to_html(docx_path)

    match = TRANSLATION_MARKER_RE.search(body)
    if match is None:
        # No translation marker; the full body becomes the transcription.
        (directory / "transcription.html").write_text(
            _wrap_transcription_page(body), encoding="utf-8"
        )
        # Remove any leftover translation.html from a previous build.
        old = directory / "translation.html"
        if old.exists():
            old.unlink()
        return False

    transcription_body = body[:match.start()].rstrip()
    translation_body = body[match.end():].lstrip()

    (directory / "transcription.html").write_text(
        _wrap_transcription_page(transcription_body), encoding="utf-8"
    )
    (directory / "translation.html").write_text(
        _wrap_transcription_page(translation_body), encoding="utf-8"
    )
    return True


def ensure_clean_dir(d: Path) -> None:
    """Remove only the asset subdirectories produced by previous builds,
    leaving any UI files (index.html, document.html, etc.) in place."""
    d.mkdir(parents=True, exist_ok=True)
    for child in d.iterdir():
        if child.is_dir():
            shutil.rmtree(child)


def folder_files(folder: Path) -> tuple[Path | None, Path | None]:
    pdf = next((p for p in folder.iterdir() if p.suffix.lower() == ".pdf"), None)
    docx = next((p for p in folder.iterdir() if p.suffix.lower() == ".docx"), None)
    return pdf, docx


# ---------------------- diplomatic ----------------------

def folder_index(folder_name: str) -> int:
    parts = folder_name.split()
    return int(parts[1])


def build_diplomatic() -> list[dict]:
    if not DIP_SRC.exists():
        print(f"[error] missing source dir: {DIP_SRC}", file=sys.stderr)
        return []

    out_root = DOC_OUT / "diplomatic"
    ensure_clean_dir(out_root)

    folders = sorted(
        [f for f in DIP_SRC.iterdir() if f.is_dir() and f.name.startswith("Dosya")],
        key=lambda f: folder_index(f.name),
    )

    # Collect (folder, date) pairs. Skip folders without a recognizable date.
    folder_records: list[dict] = []
    for f in folders:
        idx = folder_index(f.name)
        nnn = f"{idx:03d}"
        target = out_root / nnn
        target.mkdir(parents=True, exist_ok=True)

        pdf, docx = folder_files(f)
        if pdf is None or docx is None:
            print(f"[warn] {f.name} missing pdf or docx; skipping", file=sys.stderr)
            continue

        shutil.copyfile(pdf, target / "original.pdf")
        shutil.copyfile(docx, target / "transcription.docx")
        has_translation = False
        try:
            has_translation = write_transcription_html(target, docx)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] {f.name} mammoth failed: {exc}", file=sys.stderr)
            (target / "transcription.html").write_text(
                TRANSCRIPTION_PAGE_TEMPLATE.format(
                    body=f'<p class="transcription-empty">Transcription unavailable: {exc}</p>'
                ),
                encoding="utf-8",
            )

        date = DOSYA_DATE_OVERRIDES.get(f.name) or extract_date_from_filename(pdf.name) \
            or extract_date_from_filename(docx.name)
        record: dict = {
            "id": f"diplomatic_{nnn}",
            "source_folder": f.name,
            "directory": f"documents/diplomatic/{nnn}",
            "pdf": "original.pdf",
            "transcription_html": "transcription.html",
            "transcription_docx": "transcription.docx",
            "has_translation": has_translation,
            "date": date,
            "communication_id": None,
        }
        if has_translation:
            record["translation_html"] = "translation.html"
        folder_records.append(record)

    # ---- map folders to communications by date ----
    comms = json.loads(COMMS_PATH.read_text(encoding="utf-8"))
    comms_by_date: dict[str, list[dict]] = {}
    for c in comms:
        if c.get("id") in COMM_SKIP:
            continue
        d = c.get("date")
        if not d:
            continue
        comms_by_date.setdefault(d, []).append(c)

    # Walk folders in order; for each date, pop the next available comm
    used_comms: set[str] = set()
    for rec in folder_records:
        d = rec["date"]
        if not d:
            continue
        bucket = comms_by_date.get(d, [])
        # Pick the first comm in this bucket that hasn't been used yet
        for cand in bucket:
            if cand["id"] not in used_comms:
                rec["communication_id"] = cand["id"]
                rec["sender"] = cand.get("sender")
                rec["receiver"] = cand.get("receiver")
                rec["sender_location"] = cand.get("sender_location")
                rec["receiver_location"] = cand.get("receiver_location")
                rec["type"] = cand.get("type")
                used_comms.add(cand["id"])
                break

    matched = sum(1 for r in folder_records if r["communication_id"])
    print(f"[diplomatic] {len(folder_records)} folders processed, "
          f"{matched} matched to communications, "
          f"{len(folder_records) - matched} orphan folders, "
          f"{len(comms) - matched} comms without a folder")

    out_path = DATA_OUT / "diplomatic_documents.json"
    out_path.write_text(json.dumps(folder_records, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"[diplomatic] wrote {out_path}")

    # Also emit a JS sibling so the data is usable from file:// and from any
    # static host without relying on fetch() (which browsers block on
    # file:// origins). Pages can include this via a regular <script src=...>.
    js_path = DATA_OUT / "diplomatic_documents.js"
    js_path.write_text(
        "window.DIPLOMATIC_DOCUMENTS = " +
        json.dumps(folder_records, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"[diplomatic] wrote {js_path}")
    return folder_records


# ---------------------- judicial ----------------------

def build_judicial() -> list[dict]:
    out_root = DOC_OUT / "judicial"
    ensure_clean_dir(out_root)

    metadata: list[dict] = []
    for entry in JUDICIAL_DOCS:
        src_dir = JUD_SRC / entry["src_subdir"]
        if not src_dir.exists():
            print(f"[warn] missing judicial source: {src_dir}", file=sys.stderr)
            continue

        target = out_root / entry["city_slug"] / entry["slug"]
        target.mkdir(parents=True, exist_ok=True)

        pdf_src = src_dir / entry["src_pdf"]
        docx_src = src_dir / entry["src_docx"]

        if pdf_src.exists():
            shutil.copyfile(pdf_src, target / "original.pdf")
        else:
            print(f"[warn] judicial pdf missing: {pdf_src}", file=sys.stderr)

        extras: list[str] = []
        for extra_name in entry.get("extra_pdfs", []) or []:
            extra_src = src_dir / extra_name
            if extra_src.exists():
                slug_extra = re.sub(r"\W+", "-", Path(extra_name).stem.lower()).strip("-")
                extra_target = target / f"{slug_extra}.pdf"
                shutil.copyfile(extra_src, extra_target)
                extras.append(extra_target.name)

        has_translation = False
        if docx_src.exists():
            shutil.copyfile(docx_src, target / "transcription.docx")
            try:
                has_translation = write_transcription_html(target, docx_src)
            except Exception as exc:  # noqa: BLE001
                print(f"[warn] judicial mammoth failed for {entry['id']}: {exc}",
                      file=sys.stderr)
                (target / "transcription.html").write_text(
                    TRANSCRIPTION_PAGE_TEMPLATE.format(
                        body=f'<p class="transcription-empty">Transcription unavailable: {exc}</p>'
                    ),
                    encoding="utf-8",
                )
        else:
            (target / "transcription.html").write_text(
                TRANSCRIPTION_PAGE_TEMPLATE.format(
                    body='<p class="transcription-empty">No transcription file available for this document.</p>'
                ),
                encoding="utf-8",
            )

        record = {
            "id": entry["id"],
            "city": entry["city"],
            "city_slug": entry["city_slug"],
            "slug": entry["slug"],
            "court": entry["court"],
            "date": entry["date"],
            "date_display": entry["date_display"],
            "session": entry["session"],
            "language": entry["language"],
            "directory": f"documents/judicial/{entry['city_slug']}/{entry['slug']}",
            "pdf": "original.pdf",
            "transcription_html": "transcription.html",
            "transcription_docx": "transcription.docx",
            "has_translation": has_translation,
        }
        if has_translation:
            record["translation_html"] = "translation.html"
        if extras:
            record["additional_pdfs"] = extras
        metadata.append(record)

    out_path = DATA_OUT / "judicial_documents.json"
    out_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"[judicial] {len(metadata)} documents processed; wrote {out_path}")

    js_path = DATA_OUT / "judicial_documents.js"
    js_path.write_text(
        "window.JUDICIAL_DOCUMENTS = " +
        json.dumps(metadata, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(f"[judicial] wrote {js_path}")
    return metadata


def main() -> None:
    DOC_OUT.mkdir(exist_ok=True)
    DATA_OUT.mkdir(exist_ok=True)
    build_diplomatic()
    build_judicial()


if __name__ == "__main__":
    main()
