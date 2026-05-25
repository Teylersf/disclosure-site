/**
 * Findings — the "what they didn't tell you" layer.
 *
 * Each item is a verifiable observation about the released files / metadata
 * that the official catalog UI does not surface. Sourced from FINDINGS.md.
 */

export type FindingTier = 1 | 2 | 3;

export interface FindingSource {
  /** Path inside the mirror (used to deep-link to evidence). */
  path: string;
  /** Optional descriptor of what's at that path. */
  note?: string;
}

export interface FindingTableRow {
  cells: string[];
}

export interface FindingTable {
  headers: string[];
  rows: FindingTableRow[];
  caption?: string;
}

export interface FindingStat {
  /** Big number (e.g. "1 of 85"). */
  big: string;
  /** What that number describes. */
  label: string;
}

export interface FindingComparison {
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
}

export interface Finding {
  id: string;
  tier: FindingTier;
  /** Headline (≤80 chars). */
  title: string;
  /** One-line claim that survives out-of-context sharing. */
  claim: string;
  /** Why it matters in 1–2 sentences. */
  significance: string;
  /** Long-form evidence (markdown-ish, rendered with simple bold/code). */
  evidence: string;
  /** Stat cards (for visual punch on the page). */
  stats?: FindingStat[];
  /** Side-by-side comparison blocks. */
  comparisons?: FindingComparison[];
  /** Tabular evidence. */
  tables?: FindingTable[];
  /** File references in the mirror. */
  sources: FindingSource[];
  /** Optional list of record ids in the manifest this finding affects. */
  relatedRecordIds?: string[];
  /** SHA / md5 strings to display in "verify yourself" panel. */
  hashes?: { label: string; hash: string }[];
}

export const FINDINGS: Finding[] = [
  {
    id: "d20-location-swap",
    tier: 1,
    title: "D-020 was relabeled from “Southern United States, 2020” to “Iraq, 2023”",
    claim: "Mission report D-020 is catalogued as Iraq 2023 — but the PDF's own embedded title still says Southern United States, 2020. Both files are byte-identical.",
    significance: "Different country. Different year. The original-titled file is still served at a predictable URL. This is the single highest-impact discrepancy in the release.",
    evidence: `The public catalog row reads **\`DOW-UAP-D020, Mission Report, Iraq, 2023\`** with incident date **\`3/31/23\`** and location **\`Iraq\`**.

The PDF's embedded **\`/Title\`** field still reads **\`DOW-UAP-D20, Mission Report, Southern United States, 2020\`** — different country, different year.

A second file lives at \`release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf\` that is **byte-identical** to the Iraq-labeled file (same md5).

The README on the live site mentions a rename happened, but never says what changed. The country and year both did.`,
    comparisons: [
      {
        leftLabel: "Public catalog (uap-data.csv)",
        leftValue: "DOW-UAP-D020, Mission Report, Iraq, 2023 · incident 3/31/23 · Iraq",
        rightLabel: "PDF /Title metadata",
        rightValue: "DOW-UAP-D20, Mission Report, Southern United States, 2020",
      },
    ],
    hashes: [
      { label: "release_1/dow-uap-d20-mission-report-iraq-2023.pdf", hash: "md5: 62b5a2a589d8ed10380264e6154e92ac" },
      { label: "release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf", hash: "md5: 62b5a2a589d8ed10380264e6154e92ac" },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d20-mission-report-iraq-2023.pdf", note: "Catalogued file (embedded /Title says Southern United States, 2020)" },
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d20-mission-report-southern-united-states-2023.pdf", note: "Orphan duplicate — byte-identical" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Row matching DOW-UAP-D020" },
    ],
  },
  {
    id: "cable-2-country-mismatch",
    tier: 1,
    title: "Cable 2 catalogued as Kazakhstan; PDF says Dushanbe, Tajikistan",
    claim: "State Department UAP Cable 002 is listed under Kazakhstan in the public catalog, but the PDF's embedded title points to Dushanbe — capital of Tajikistan.",
    significance: "Dushanbe is the capital of Tajikistan, not Kazakhstan. The date and document ID match — only the country changed between the PDF's metadata and the catalog row.",
    evidence: `The catalog row reads **\`State Department UAP Cable 002, Kazakhstan, January 31, 1994\`**.

The PDF's embedded **\`/Title\`** reads **\`State Department UAP Cable 2, Dushanbe Tajikistan, January 31, 1994\`** (trailing space preserved as in the original).

Date and cable number agree. Only the country changed.`,
    comparisons: [
      {
        leftLabel: "Public catalog",
        leftValue: "Cable 002, Kazakhstan, January 31, 1994",
        rightLabel: "PDF /Title metadata",
        rightValue: "Cable 2, Dushanbe Tajikistan, January 31, 1994",
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1/dos-uap-d2-cable-2-kazakhstan-january-1994.pdf", note: "PDF whose /Title disagrees with catalog" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Cable 002 row" },
    ],
  },
  {
    id: "columbus-ohio-leak",
    tier: 1,
    title: "PR-073: the one video that wasn’t scrubbed",
    claim: "Of all 85 declassified UAP videos, exactly one leaks city-level location, names a credited individual, uses a non-AARO unit code, and preserves the raw DIA report ID. The other 84 are scrubbed of all four.",
    significance: "PR-073 is uniquely un-redacted across four independent metadata fields. Either the curation process missed this single record, or it was deliberately exempted.",
    evidence: `The DVIDS metadata for video **PR-073** stands alone across all 85 released videos:

**Location.** Country, state, *and* city: \`{ city: "Columbus", state: "Ohio", country: "United States" }\`. The other 84 are either \`"Undisclosed Location"\`, country-only, or \`"At Sea"\`.

**Credit.** A named, linked individual: \`{ name: "Edward Pajak", url: "https://www.dvidshub.net/portfolio/1000736" }\`. The other 84 all say \`"Courtesy"\`.

**Unit code.** VIRIN \`221101-O-XX999-9738\` — \`XX999\` is the DVIDS placeholder for "unknown unit," and the \`O\` (rather than \`D\`) signals "Other" service of origin. The other 84 all use unit code \`D0360\` (AARO).

**Title.** \`DOW-UAP-PR073, IIR 1 655 S0053 23/Several Unidentified Aerial Phenomenon Encountered In The Vicinity of Columbus OH\` — \`IIR 1 655 S0053 23\` is the Defense Intelligence Agency *Intelligence Information Report* serial number left in the public title.`,
    stats: [
      { big: "1 of 85", label: "videos with city-level location" },
      { big: "1 of 85", label: "videos with a named credit" },
      { big: "1 of 85", label: "videos with non-AARO unit code" },
      { big: "1 of 85", label: "videos with raw DIA IIR# in title" },
    ],
    sources: [
      { path: "api.dvidshub.net/asset/video-1007790.json", note: "PR-073 — the un-scrubbed record" },
      { path: "api.dvidshub.net/asset", note: "Other 84 records (cross-check: all have credit “Courtesy”, unit AARO, VIRIN D0360)" },
    ],
    relatedRecordIds: ["dvids-1007790"],
  },
  {
    id: "pr055-afg-us-mismatch",
    tier: 1,
    title: "“Spherical UAP over AFG” — country field says United States",
    claim: "PR-055 (“Spherical UAP over AFG in and out of clouds, 23 Nov 2020”) has its DVIDS country field set to United States, not Afghanistan.",
    significance: "Could be data entry, could be deliberate. PR-064 (“AFSOC Kabul UAP Jul 2017”) is the control case — it correctly has \`country: \"Afghanistan\"\`.",
    evidence: `Video title: **\`DOW-UAP-PR055, "Spherical UAP over AFG in and out of clouds 23 Nov 2020"\`**

DVIDS \`location.country\`: **\`United States\`** (\`country_abbreviation: "US"\`)
DVIDS \`date\`: \`2020-11-23\` — matches title.

Control case: **PR-064** (\`AFSOC Kabul UAP Jul 2017\`) correctly has \`country: "Afghanistan"\`. So the field *is* used elsewhere; this isn't a global omission.`,
    comparisons: [
      {
        leftLabel: "Title says",
        leftValue: "Spherical UAP over AFG (Afghanistan)",
        rightLabel: "Country field says",
        rightValue: "United States",
      },
    ],
    sources: [
      { path: "api.dvidshub.net/asset/video-1007713.json", note: "PR-055" },
      { path: "api.dvidshub.net/asset/video-1007741.json", note: "PR-064 — control case, correctly tagged Afghanistan" },
    ],
    relatedRecordIds: ["dvids-1007713", "dvids-1007741"],
  },
  {
    id: "d-to-pr-relabel",
    tier: 1,
    title: "The D → PR crosswalk",
    claim: "Several internal D-series Mission Reports were re-released as public PR-series Unresolved UAP Reports. The PDFs still carry their original D-series titles.",
    significance: "Useful navigation for researchers. The relationship is hinted at in each PR description (“an accompanying mission report, D-XX, described…”) but never surfaced as a navigable mapping.",
    evidence: `Five files in the mirror have an embedded D-series \`/Title\` while their public catalog entry is PR-series. The DVIDS description for PR-019 even says: *“An accompanying mission report, DoW-UAP-D10, described the observation as a ‘possible missile’…”* — so the link is no secret, just not surfaced as navigation.`,
    tables: [
      {
        caption: "Embedded D-series title → Public PR-series catalog title",
        headers: ["File", "Embedded /Title", "Public catalog title"],
        rows: [
          { cells: ["dow-uap-d10-…-may-2022.pdf", "D-10", "DOW-UAP-PR019, Middle East, May 2022"] },
          { cells: ["dow-uap-d14-iraq-may-2022.pdf", "DOW-UAP-D14, Mission Report, Iraq, May 2022", "DOW-UAP-PR021, Iraq, May 2022"] },
          { cells: ["dow-uap-d16-syria-jul-2022.pdf", "DOW-UAP-D16, Mission Report, Syria, July 2022", "DOW-UAP-PR022, Syria, July 2022"] },
          { cells: ["dow-uap-d18-iraq-dec-2022.pdf", "D-18", "DOW-UAP-PR023, Iraq, December 2022"] },
          { cells: ["dow-uap-d23-uae-oct-2023.pdf", "DOW-UAP-D23, Mission Report, United Arab Emirates, October 2023", "DOW-UAP-PR027, United Arab Emirates, October 2023"] },
        ],
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d10-mission-report-middle-east-may-2022.pdf" },
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d14-mission-report-iraq-may-2022.pdf" },
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d16-mission-report-syria-july-2022.pdf" },
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d18-mission-report-iraq-december-2022.pdf" },
      { path: "www.war.gov/medialink/ufo/release_1/dow-uap-d23-mission-report-united-arab-emirates-october-2023.pdf" },
      { path: "api.dvidshub.net/asset/video-1006056.json", note: "PR-019 description acknowledges D-10" },
    ],
  },
  {
    id: "archive-shelfmark-leak",
    tier: 1,
    title: "PDF titles contain raw NARA shelfmarks",
    claim: "Some PDFs' embedded titles aren't UAP descriptions — they're the literal NARA shelfmarks. That tells you which archive box each document came from.",
    significance: "Researchers and FOIA filers can now trace each document back to its origin record group, container, and folder. The numeric prefixes match NARA Record Group numbers.",
    evidence: `The numeric prefixes (\`374_\`, \`255_\`, \`342_\`, \`38_\`, \`59_\`, \`65_\`, \`331_\`, \`341_\`) in many filenames are NARA Record Group numbers:

- **RG 374** — Defense Threat Reduction Agency / AFSWP successor
- **RG 255** — NASA
- **RG 65** — FBI
- **RG 59** — State Department
- **RG 38** — Navy Bureau of Naval Personnel
- **RG 341** — Headquarters U.S. Air Force
- **RG 342** — U.S. Air Force commands, activities, organizations
- **RG 331** — Allied Operational and Occupation Headquarters, WWII

Several PDFs have *only* the shelfmark as their embedded title — no UAP description at all.`,
    tables: [
      {
        caption: "PDFs whose /Title is just the archive shelfmark",
        headers: ["File", "Embedded /Title (shelfmark)", "Public catalog title"],
        rows: [
          { cells: [
            "052226/release_02/.../dow-uap-d017_general_correspondence_of_sandia.pdf",
            "374_141326_General_Correspondence_of_Sandia_Base_Folder_333",
            "DOW-UAP-D017, UAP Reported at Sandia Base, 1948-1950",
          ] },
          { cells: [
            "release_1/255_t_763_r1b_transcripts.pdf",
            "255_t_763_r1b_transcripts",
            "NASA-UAP-D003, Gemini 7 Transcript, 1965",
          ] },
        ],
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1", note: "All PDFs — /Title fields" },
      { path: "www.war.gov/medialink/ufo/052226/release_02/documents", note: "Release 2 PDFs" },
    ],
  },
  {
    id: "skylab-typo",
    tier: 1,
    title: "Catalog: “Techincal” · PDF: “Technical”",
    claim: "The catalog row for NASA-UAP-D007 misspells “Technical”. The PDF's own /Title field has it right.",
    significance: "A small, charming proof that the public catalog was hand-edited downstream of the PDFs.",
    evidence: `**Catalog row** (\`uap-data.csv\`): \`NASA-UAP-D007, Skylab **Techincal** Crew Debriefing 1973\`
**PDF /Title**: \`NASA-UAP-D7, Skylab **Technical** Crew Debriefing, 1973\``,
    comparisons: [
      {
        leftLabel: "Public catalog (typo)",
        leftValue: "Skylab Techincal Crew Debriefing 1973",
        rightLabel: "PDF /Title (correct)",
        rightValue: "Skylab Technical Crew Debriefing, 1973",
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1/nasa-uap-d7-skylab-technical-crew-debriefing-1973.pdf" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv" },
    ],
  },
  {
    id: "orphan-pdfs",
    tier: 2,
    title: "Orphan PDFs still served at predictable URLs",
    claim: "Four PDFs are present on the public server but no longer referenced by the live manifest. Earlier versions remain quietly accessible.",
    significance: "The pattern — that the Department of War still serves earlier versions of files at predictable URLs — is itself the finding.",
    evidence: `Files present on disk but not referenced by the current \`uap-data.csv\`:

• **\`dow-uap-d20-mission-report-southern-united-states-2023.pdf\`** — byte-identical to the Iraq version (see Finding 1, *d20-location-swap*).
• **\`59_214434_sp_16_7.18.1963.pdf\`** — byte-identical to the bracketed version that *is* referenced (md5 \`6039f96c52e566b69f3a3d774b7653fa\`).
• **\`serial 5 redacted_redacted.pdf\`** (with a literal space in the filename).
• **\`18_100754_ general 1946-7_vol_2.pdf\`** (leading space inside the filename).`,
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1", note: "Disk listing diffed against catalog" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv" },
    ],
  },
  {
    id: "orphan-css-and-csv",
    tier: 2,
    title: "Old stylesheets and an earlier-schema manifest still served",
    claim: "Older stylesheets and the prior-schema CSV manifest are still publicly served, but no longer referenced by the live page.",
    significance: "Provides a paper trail of how the catalog UI evolved between releases. The earlier CSV had a different column schema (no Image Alt Text, no Image VIRIN).",
    evidence: `• **\`aaro3.css\`** — old stylesheet. Live page now loads \`aaro07.css\`.
• **\`ufo2.css\`** — another old stylesheet, not referenced.
• **\`uap-csv.csv\`** — earlier release-1 manifest. Different column schema. Still served. 573 lines vs the live \`uap-data.csv\` at 1234 lines.`,
    sources: [
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/aaro3.css" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/ufo2.css" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-csv.csv", note: "Earlier-schema manifest, 573 lines" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Current live manifest, 1234 lines" },
    ],
  },
  {
    id: "orphan-slideshow-images",
    tier: 2,
    title: "17 orphaned slideshow images from the v1 carousel",
    claim: "The live page's carousel only loads from \`Slideshow-2/\`. All 17 images in the original \`Slideshow/\` folder are orphaned but still served.",
    significance: "The Open Graph card on the live page still references the orphaned PR46 image. Social shares still pull v1 imagery while the live page shows v2.",
    evidence: `The 17 orphaned images still served from \`Portals/1/Interactive/2026/UFO/Slideshow/\`:

\`2024-04-30-Composite-Sketch.jpg\` ·
\`DOW-UAP-PR19…May-2022.jpg\` ·
\`DOW-UAP-PR26…Oct-2023.jpg\` ·
\`DOW-UAP-PR34…Oct-2023.jpg\` ·
\`DOW-UAP-PR35…Oct-2023.jpg\` ·
\`DOW-UAP-PR38…2013.jpg\` ·
\`DOW-UAP-PR43…Africa-2025.jpg\` ·
\`DOW-UAP-PR45…2020.jpg\` ·
\`DOW-UAP-PR46…INDOPACOM-2024.jpg\` ·
\`DOW-UAP-PR49…Army-2026.jpg\` ·
\`FBI-Photo-1.jpg\`, \`FBI-Photo-A5.jpg\`, \`FBI-Photo-B2.jpg\`, \`FBI-Photo-B7-.jpg\`, \`FBI-Photo-B18.jpg\`, \`FBI-Photo-B20.jpg\` ·
\`NASA-UAP-VM6-Apollo-17-1972.jpg\``,
    sources: [
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/Slideshow", note: "Orphaned v1 carousel — still served" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/Slideshow-2", note: "Live carousel" },
    ],
  },
  {
    id: "pdf-creator-fingerprints",
    tier: 3,
    title: "PDF creator fingerprints — the scanning toolchain",
    claim: "PDF \`/Creator\` and \`/Producer\` fields expose the full scanning and redaction toolchain used to assemble the release.",
    significance: "Provides a window into the production pipeline: physical scans on late-90s hardware, Fujitsu overhead scanners, Adobe OCR, macOS PDF assembly.",
    evidence: `Software signatures collected from PDF \`/Creator\` and \`/Producer\` fields across all 124 PDFs:

• **HP 9100C Digital Sender** — late-90s scanner-to-email appliance.
• **PFU ScanSnap Home 2.20.0 #SV600** — Fujitsu overhead document scanner.
• **PaperStream Capture 5.1** — Fujitsu scanning software.
• **LuraDocument PDF Compressor Server 5.7.66.46** — enterprise TIFF→PostScript→PDF compression (annotation \`tif_convert_2_ps()\`).
• **Adobe Photoshop 25.6 (Windows)** — image-based PDFs went through Photoshop (consistent with burned-in redactions).
• **macOS Version 26.4 (Build 25E246) Quartz PDFContext, AppendMode 1.1** — some PDFs assembled on macOS 26.4 build 25E246; pages appended post-generation.
• **Adobe Acrobat (32-bit) 26 Paper Capture Plug-in** — OCR pass via Acrobat's Paper Capture.
• **PFUPDF Engine 1.3.10** and **1.3.80** — two different Fujitsu PDF engines, suggesting two scanning stations / time periods.
• **Aspose Pty Ltd.** — programmatic PDF assembly library, suggesting automated batch processing for some documents.`,
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1", note: "All 124 PDF /Creator and /Producer fields" },
    ],
  },
  {
    id: "dvids-country-coverage",
    tier: 3,
    title: "22 of 85 videos expose a specific country in DVIDS metadata",
    claim: "The public catalog mostly says “Middle East” or “Undisclosed Location.” The per-video DVIDS JSON exposes specific countries on 22 of the 85 videos.",
    significance: "Lets you build the actual geographic distribution of UAP encounters in the release — not the sanitised one in the catalog.",
    evidence: `Country distribution across the 85 declassified videos, sourced from the DVIDS \`location.country\` field on each:`,
    stats: [
      { big: "5", label: "Syria" },
      { big: "3", label: "Greece" },
      { big: "3", label: "United Arab Emirates" },
      { big: "3", label: "United States" },
      { big: "2", label: "At Sea" },
      { big: "1", label: "Iraq" },
      { big: "1", label: "Iran" },
      { big: "1", label: "Afghanistan" },
      { big: "1", label: "Kazakhstan" },
      { big: "1", label: "Columbus OH (see PR-073)" },
      { big: "63", label: "Undisclosed (rest of corpus)" },
    ],
    sources: [
      { path: "api.dvidshub.net/asset", note: "All 85 DVIDS JSON files" },
    ],
  },
  {
    id: "html-curios",
    tier: 3,
    title: "Curios in the live HTML",
    claim: "Small leftovers in the live page's HTML — dev console logs, hidden links, internal-host meta tags, the Pentagon's coordinates, a typo'd \`noopeneer\`.",
    significance: "Mostly tradecraft / colour. Worth noting because each item is observable in the released page source.",
    evidence: `• Leftover dev \`console.log("click1 " + (typeof gas4 === "function"))\` at line 2147.
• A \`<a style="display:none">\` link to the old release-1 CSV at line 1711.
• GA4 reports record modal views as \`/UFOTrack/\` page hits — no real \`/UFOTrack/\` page exists, just a tracking namespace.
• Internal-host meta tags at the bottom of \`<head>\`: \`<meta name='host' content='DWIA Public Web' />\` (Defense Web Infrastructure Activity) and \`<meta name='contact' content='dma.WebSD@mail.mil' />\` (DMA Web Service Desk).
• Footer coordinates \`38°52′15″N, 77°03′18″W\` — the Pentagon. Intentional touch, not a leak.
• \`rel="noopeneer noreferrer"\` typo (should be \`noopener\`).
• Google Font \`Inconsolataa\` returns HTTP 400 — server-side typo. Page falls back to system fonts.`,
    sources: [
      { path: "www.war.gov/UFO/index.html", note: "Live page HTML" },
    ],
  },
];

export const TIER1 = FINDINGS.filter((f) => f.tier === 1);
export const TIER2 = FINDINGS.filter((f) => f.tier === 2);
export const TIER3 = FINDINGS.filter((f) => f.tier === 3);

export function getFinding(id: string): Finding | undefined {
  return FINDINGS.find((f) => f.id === id);
}

export function getAllFindingIds(): string[] {
  return FINDINGS.map((f) => f.id);
}

/** Returns the findings that mention this record id. */
export function findingsForRecord(recordId: string): Finding[] {
  return FINDINGS.filter((f) => f.relatedRecordIds?.includes(recordId));
}
