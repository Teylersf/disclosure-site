# Hidden findings in the PURSUE mirror

Source: offline mirror of `https://www.war.gov/UFO/` at `../www.war.gov/`, `../api.dvidshub.net/`, `../d34w7g4gy10iej.cloudfront.net/`, `../d1ldvf68ux039x.cloudfront.net/` (relative to this repo). Findings are things present in the released files / metadata that the official catalog UI does not surface. Every claim below is verifiable from files in the mirror — provenance paths and line numbers are included so the site can deep-link to evidence.

## How to use this doc

Each finding has a stable `id` (use it as a slug/anchor), a one-line `claim`, full `evidence`, exact `sources`, and a `suggested_ui` block. The intended pattern is one canonical detail page per finding plus an index. Treat the catalog the site already has as the primary record set; treat these findings as a *secondary* "what they didn't tell you" layer that links *back* to the primary records.

When citing, always link to the underlying file in the mirror so readers can verify. Don't paraphrase the embedded metadata — quote it. The whole point is that the evidence is in the released files themselves.

---

## TIER 1 — substantive discrepancies

These are the publish-worthy items. Each one is a fact about the released data, not speculation.

### Finding 1 — `d20-location-swap`

**Claim:** The mission report catalogued as "DOW-UAP-D020, Mission Report, Iraq, 2023" was originally titled "Mission Report, Southern United States, 2020" — different country, different year. The original-titled file is still on the server as a byte-identical duplicate.

**Evidence:**
- Public catalog title (`Portals/1/Interactive/2026/UFO/uap-data.csv`): `DOW-UAP-D020, Mission Report, Iraq, 2023`
- Embedded PDF `/Title` field inside `release_1/dow-uap-d20-mission-report-iraq-2023.pdf`: `DOW-UAP-D20, Mission Report, Southern United States, 2020`
- A second file exists at `release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf` which is **byte-identical** to the Iraq-labeled file (md5 `62b5a2a589d8ed10380264e6154e92ac` for both). README.txt §"Known Notes" hints at this rename without flagging the country/year discrepancy.
- The catalog incident date is `3/31/23`, and the location is `Iraq` — neither matches the embedded title.

**Sources:**
- `../www.war.gov/medialink/ufo/release_1/dow-uap-d20-mission-report-iraq-2023.pdf` (embedded `/Title`)
- `../www.war.gov/medialink/ufo/release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf` (orphan duplicate)
- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv` (row matching `DOW-UAP-D020`)

**Suggested UI:** detail page comparing the two titles side-by-side, with a "verify it yourself" block showing the md5 of both files. This is the highest-impact finding — should be the lead card on the findings index.

---

### Finding 2 — `cable-2-country-mismatch`

**Claim:** State Department Cable 2 is catalogued under "Kazakhstan" but the PDF's own embedded title says "Dushanbe Tajikistan." Dushanbe is the capital of Tajikistan, not Kazakhstan.

**Evidence:**
- Public catalog title: `State Department UAP Cable 002, Kazakhstan, January 31, 1994`
- Embedded PDF `/Title`: `State Department UAP Cable 2, Dushanbe Tajikistan, January 31, 1994` (trailing space preserved)
- Date matches between catalog and embed; only the country/city changed.

**Sources:**
- `../www.war.gov/medialink/ufo/release_1/dos-uap-d2-cable-2-kazakhstan-january-1994.pdf` (`/Title`)
- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv` (Cable 002 row)

**Suggested UI:** side-by-side card. Possible map element showing Dushanbe in Tajikistan (not Kazakhstan).

---

### Finding 3 — `columbus-ohio-leak`

**Claim:** Of all 85 declassified UAP videos, exactly one (DOW-UAP-PR073) leaks city-level location, names a credited individual, uses a non-AARO unit code, and preserves the raw DIA Intelligence Information Report ID in its title. The other 84 videos are scrubbed of all four.

**Evidence — uniqueness across the 85-video corpus:**
- **Only video with city + state:** `location: { city: "Columbus", state: "Ohio", country: "United States" }`. The other 84 are either `"Undisclosed Location"`, a country only, or `"At Sea"`.
- **Only video with a named credit:** `credit: [{ id: 1000736, name: "Edward Pajak", url: "https://www.dvidshub.net/portfolio/1000736" }]`. The other 84 all have `credit: "Courtesy"`.
- **Only non-AARO VIRIN unit code:** `virin: "221101-O-XX999-9738"`. The other 84 use unit code `D0360` (AARO). `XX999` is a known DVIDS placeholder for "unknown unit"; the `O` (rather than `D`) signals an "Other" service-of-origin.
- **Raw IIR identifier in the public title:** `DOW-UAP-PR073, IIR 1 655 S0053 23/Several Unidentified Aerial Phenomenon Encountered In The Vicinity of Columbus OH`. `IIR 1 655 S0053 23` is a Defense Intelligence Agency Intelligence Information Report serial number left in the title.

**Sources:**
- `../api.dvidshub.net/asset/video-1007790.json` (entire record)
- Cross-check: the other 84 JSONs in `../api.dvidshub.net/asset/` all have `credit: "Courtesy"`, `unit_id: "8597"` (AARO), and VIRIN unit-code `D0360`.

**Suggested UI:** dedicated detail page. Show the four anomalies as four stat cards ("1 of 85" each). Link out to the DVIDS portfolio URL (only finding where an external link is justified — it's already public). Embed/link the video.

---

### Finding 4 — `pr055-afg-us-mismatch`

**Claim:** The video titled "Spherical UAP over AFG in and out of clouds" (PR055) has DVIDS country field set to `United States`, not Afghanistan.

**Evidence:**
- `title: 'DOW-UAP-PR055, "Spherical UAP over AFG in and out of clouds 23 Nov 2020"'`
- `location.country: "United States"` (`country_abbreviation: "US"`)
- `date: "2020-11-23"` matches the date in the title.
- For comparison, [PR064](../api.dvidshub.net/asset/video-1007741.json) ("AFSOC Kabul UAP Jul 2017") correctly has `country: "Afghanistan"`.

**Sources:**
- `../api.dvidshub.net/asset/video-1007713.json`
- `../api.dvidshub.net/asset/video-1007741.json` (control case)

**Suggested UI:** smaller card on the findings index. Could be a "data-entry error or deliberate?" framing — don't editorialise, present both options.

---

### Finding 5 — `d-to-pr-relabel`

**Claim:** Several documents originally classified as internal "D-series" Mission Reports were re-released as public "PR-series" Unresolved UAP Reports. The PDFs still carry their original D-series titles in their metadata.

**Evidence (D → PR mapping recovered from embedded PDF titles):**

| File | Embedded `/Title` | Public catalog title |
|---|---|---|
| `release_1/dow-uap-d10-mission-report-middle-east-may-2022.pdf` | `D-10` | `DOW-UAP-PR019, Unresolved UAP Report, Middle East, May 2022` |
| `release_1/dow-uap-d14-mission-report-iraq-may-2022.pdf` | `DOW-UAP-D14, Mission Report, Iraq, May 2022` | `DOW-UAP-PR021, Unresolved UAP Report, Iraq, May 2022` |
| `release_1/dow-uap-d16-mission-report-syria-july-2022.pdf` | `DOW-UAP-D16, Mission Report, Syria, July 2022` | `DOW-UAP-PR022, Unresolved UAP Report, Syria, July 2022` |
| `release_1/dow-uap-d18-mission-report-iraq-december-2022.pdf` | `D-18` | `DOW-UAP-PR023, Unresolved UAP Report, Iraq, December 2022` |
| `release_1/dow-uap-d23-mission-report-united-arab-emirates-october-2023.pdf` | `DOW-UAP-D23, Mission Report, United Arab Emirates, October 2023` | `DOW-UAP-PR027, Unresolved UAP Report, United Arab Emirates, October 2023` |

The DVIDS JSON for PR019 even acknowledges the link in its description: *"An accompanying mission report, DoW-UAP-D10, described the observation as a 'possible missile'…"* — so the D↔PR relationship is no secret, but the relabel pattern (and the missing D-series numbers in the public list) isn't surfaced anywhere in the UI.

**Sources:**
- PDF `/Title` fields in the five files above
- `../api.dvidshub.net/asset/video-1006056.json` (PR019 description acknowledging D10)
- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv`

**Suggested UI:** a "crosswalk" table page — D-series ID on the left, PR-series ID on the right, each linking to its catalog page. This is genuinely useful navigation for researchers.

---

### Finding 6 — `archive-shelfmark-leak`

**Claim:** Some PDFs' embedded titles aren't UAP-related descriptions at all — they're the raw archive shelfmarks from where the document was pulled. This tells you exactly which NARA/agency box the file came from.

**Evidence:**

| File | Embedded `/Title` (the shelfmark) | What the catalog calls it |
|---|---|---|
| `052226/release_02/documents/dow-uap-d017_general_correspondence_of_sandia.pdf` | `374_141326_General_Correspondence_of_Sandia_Base_Folder_333` | `DOW-UAP-D017, UAP Reported at Sandia Base, 1948-1950` |
| `release_1/255_t_763_r1b_transcripts.pdf` | `255_t_763_r1b_transcripts` | `NASA-UAP-D003, Gemini 7 Transcript, 1965` |

The numeric prefixes (`374_`, `255_`, `342_`, `38_`, `59_`, `65_`, `331_`, `341_`) match NARA Record Group numbers (RG 374 = Defense Threat Reduction Agency / AFSWP successor; RG 255 = NASA; RG 65 = FBI; RG 59 = State Department; RG 38 = Navy Bureau of Naval Personnel; etc.). Researchers can now trace each document back to its origin record group, container, and folder.

**Sources:** PDF `/Title` fields in `release_1/` and `052226/release_02/documents/`.

**Suggested UI:** a "where it came from" annotation on document detail pages, with the NARA RG decoded ("RG 374 — AFSWP records" etc.). High value for journalists and FOIA researchers.

---

### Finding 7 — `skylab-typo`

**Claim:** The public catalog spells "Skylab Techincal Crew Debriefing" — the PDF's own metadata has "Technical" spelled correctly.

**Evidence:**
- `uap-data.csv` row: `NASA-UAP-D007, Skylab Techincal Crew Debriefing 1973`
- PDF `/Title`: `NASA-UAP-D7, Skylab Technical Crew Debriefing, 1973`

**Sources:**
- `../www.war.gov/medialink/ufo/release_1/nasa-uap-d7-skylab-technical-crew-debriefing-1973.pdf`
- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv`

**Suggested UI:** include in a "minor errors in the official catalog" sidebar. Don't make a whole page just for this.

---

## TIER 2 — server-hygiene leftovers

Worth a single combined page (something like `/findings/orphans`). Not individually substantive, but the *pattern* — that the Department of War still serves earlier versions of files at predictable URLs — is itself a finding.

### Finding 8 — `orphan-pdfs`

Files present in the mirror but **not referenced by the live `uap-data.csv` manifest**:

- `release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf` — byte-identical to the Iraq version (see Finding 1).
- `release_1/59_214434_sp_16_7.18.1963.pdf` — byte-identical to `release_1/59_214434_sp_16_[7.18.1963].pdf` (the bracketed version is the one referenced). Same md5: `6039f96c52e566b69f3a3d774b7653fa`.
- `release_1/serial 5 redacted_redacted.pdf` (with a literal space) — sibling of the referenced `serial-3_redacted.pdf` / `serial-4-redacted_redacted.pdf`.
- `release_1/18_100754_ general 1946-7_vol_2.pdf` (leading space inside the filename).

**Sources:** disk listing of `../www.war.gov/medialink/ufo/release_1/` diffed against the `PDF | Image Link` and `Modal Image` columns of `uap-data.csv`.

### Finding 9 — `orphan-css-and-csv`

Old asset versions still served at predictable URLs:
- `../www.war.gov/Portals/1/Interactive/2026/UFO/aaro3.css` — old stylesheet, not referenced by `UFO/index.html` (live one is `aaro07.css`).
- `../www.war.gov/Portals/1/Interactive/2026/UFO/ufo2.css` — another old stylesheet, not referenced.
- `../www.war.gov/Portals/1/Interactive/2026/UFO/uap-csv.csv` — earlier release-1 manifest with a different column schema (no "Image Alt Text" or "Image VIRIN" columns). Still served. 573 lines vs the live `uap-data.csv` at 1234 lines.

### Finding 10 — `orphan-slideshow-images`

The original Open Graph card still points at `Slideshow/DOW-UAP-PR46-Unresolved-UAP-Report-INDOPACOM-2024.jpg`, but the live page's carousel only loads from `Slideshow-2/`. All 17 images in `../www.war.gov/Portals/1/Interactive/2026/UFO/Slideshow/` are orphaned by the carousel (though still served):

```
2024-04-30-Composite-Sketch.jpg
DOW-UAP-PR19-Unresolved-UAP-Report-Middle-East-May-2022.jpg
DOW-UAP-PR26-Unresolved-UAP-Report-United-Arab-Emirates-October-2023.jpg
DOW-UAP-PR34-Unresolved-UAP-Report-Greece-October-2023.jpg
DOW-UAP-PR35-Unresolved-UAP-Report-Greece-October-2023.jpg
DOW-UAP-PR38-Unresolved-UAP-Report-Middle-East-2013.jpg
DOW-UAP-PR43-Unresolved-UAP-Report-Africa-2025.jpg
DOW-UAP-PR45-Unresolved-UAP-Report-Middle-East-2020.jpg
DOW-UAP-PR46-Unresolved-UAP-Report-INDOPACOM-2024.jpg
DOW-UAP-PR49-Unresolved-UAP-Report-Department-of-the-Army-2026.jpg
FBI-Photo-1.jpg, FBI-Photo-A5.jpg, FBI-Photo-B2.jpg, FBI-Photo-B7-.jpg, FBI-Photo-B18.jpg, FBI-Photo-B20.jpg
NASA-UAP-VM6-Apollo-17-1972.jpg
```

---

## TIER 3 — tradecraft and curios

Filler content / context, not finds. Group on one page (`/findings/notes`).

### Finding 11 — `pdf-creator-fingerprints`

Software signatures left in the PDFs' `/Creator` and `/Producer` fields reveal the scanning/redaction workflow:
- **HP 9100C Digital Sender** — late-90s scanner-to-email appliance (suggests old physical scans).
- **PFU ScanSnap Home 2.20.0 #SV600** — Fujitsu overhead document scanner.
- **PaperStream Capture 5.1** — Fujitsu's scanning software.
- **LuraDocument PDF Compressor Server 5.7.66.46 (original: tif_convert_2_ps())** — enterprise TIFF→PostScript→PDF compression pipeline (the `tif_convert_2_ps()` annotation is unusually specific).
- **Adobe Photoshop 25.6 (Windows)** — some image-based PDFs went through Photoshop (consistent with burned-in redactions).
- **macOS Version 26.4 (Build 25E246) Quartz PDFContext, AppendMode 1.1** — at least some PDFs were assembled/modified on macOS 26.4 build 25E246, with `AppendMode 1.1` (pages appended after initial generation).
- **Adobe Acrobat (32-bit) 26 Paper Capture Plug-in** — OCR pass via Acrobat's Paper Capture.
- **PFUPDF Engine 1.3.10** and **1.3.80** — two different Fujitsu PDF engines, suggesting two different scanning stations / time periods.
- **Aspose Pty Ltd.** — programmatic PDF assembly library (suggests automated batch processing for some documents).

**Sources:** PDF `/Creator` and `/Producer` fields across all 124 PDFs in the mirror.

### Finding 12 — `dvids-country-coverage`

The public catalog mostly says "Middle East" / "Undisclosed Location," but the per-video DVIDS JSON exposes specific countries on 22 of the 85 videos. Countries that appear: **Syria** (5), **Greece** (3), **United Arab Emirates** (3), **United States** (3), **Iraq** (1), **Iran** (1), **Afghanistan** (1), **Kazakhstan** (1), **At Sea** (2), plus the Columbus OH one. Worth a small map visualisation or country tag chips on each video record.

**Source:** all 85 files in `../api.dvidshub.net/asset/`.

### Finding 13 — `html-curios`

Minor things in `../www.war.gov/UFO/index.html`:
- Leftover dev `console.log("click1 " + (typeof gas4 === "function"))` at line 2147.
- A `<a style="display:none">` link to the old release-1 CSV at line 1711.
- GA4 reports record modal views as `/UFOTrack/` page hits — no real `/UFOTrack/` page exists, just a tracking namespace.
- Internal-host meta tags exposed at the bottom of `<head>`: `<meta name='host' content='DWIA Public Web' />` (Defense Web Infrastructure Activity) and `<meta name='contact' content='dma.WebSD@mail.mil' />` (DMA Web Service Desk).
- Footer coordinates `38°52′15″N, 77°03′18″W` — the Pentagon (an obvious intentional touch, not a leak).
- `rel="noopeneer noreferrer"` typo (should be `noopener`).
- Google Font `Inconsolataa` returns 400 — server-side typo, page falls back to system fonts. Already noted in `README.txt`.

---

## Things I checked and ruled out

So the site doesn't end up republishing these as "finds":

- The "Narrative Descriptions" of every FBI photo are present in both the live `uap-data.csv` and the older orphan `uap-csv.csv`. Not a leak.
- No `robots.txt`, `.htaccess`, `web.config`, `.bak`/`.orig`/`Thumbs.db`/`.DS_Store` anywhere in the mirror.
- No literal `secret`/`admin`/`staging`/`backstage` strings.
- The DVIDS "Live Events" widget has `testUseTestData` config keys but the live page never enables them. Dead dev infra in a vendor module, not a flag.
- All PDFs have empty `/Author` fields (correctly scrubbed).
- The `api_key=key-68bb60d16b35e` baked into the DVIDS HLS URLs is a public DVIDS API key — already noted in `README.txt` as such.

---

## Methodology

Each Tier-1 claim was verified two ways: (1) read the file from disk via Python + PyMuPDF (for PDFs) / json (for DVIDS), and (2) cross-check against `uap-data.csv` for the public-facing label. The byte-identical duplicate claim is `md5sum`-confirmed. The "uniqueness across 85 videos" claims in Finding 3 were checked by iterating all 85 JSON files and confirming the field appears nowhere else.

If the site agent wants to re-verify any claim before publishing, the relevant one-off scripts I used are still in `C:/Users/theri/AppData/Local/Temp/`:
- `pdf_meta2.py` — dumps unique `/Title`, `/Creator`, `/Producer`, `/Author` across all PDFs
- `title_diff.py` — finds PDFs whose embedded title doesn't match the catalog title
- `dvids_scan.py` and `dvids_dig.py` — DVIDS JSON aggregation

## SEO notes for the agent

The high-intent search queries this content can win against are narrow and long-tail — that's a good thing for ranking:
- "DOW-UAP-D20 Southern United States" / "PURSUE D20 Iraq location"
- "PURSUE UAP Columbus Ohio Edward Pajak"
- "DOW-UAP D to PR relabel" / "PURSUE document crosswalk"
- "war.gov UFO PDF metadata"

Each finding should be its own indexable detail page with: distinctive `<title>`, unique meta description quoting the discrepancy, `<h1>` matching the slug, the underlying file linked with `rel="noopener"` and the file extension/size shown. Findings index page should set `<meta name="robots" content="index,follow">`. Don't fabricate dates — use the actual catalog `Release Date` from `uap-data.csv` for any "as of" timestamps.

Avoid words like "leaked" or "secret" in titles — these are *released* documents and the discrepancies are observable in the public files. The accurate framing is "metadata still shows…" or "the catalog disagrees with the document's own title." That framing also holds up legally and is more credible.
