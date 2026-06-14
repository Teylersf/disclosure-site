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
    id: "may-27-silent-republish",
    tier: 1,
    title: "Between May 25 and May 27, 2026, the Department of War silently republished 69 PDFs without a public announcement",
    claim: "A byte-level diff between a snapshot of the war.gov/UFO/ archive captured on 2026-05-25 and the live state on 2026-05-27 shows 69 PDFs and 1 thumbnail with completely different MD5 hashes from the originals. The CSV manifest still lists exactly 222 records and only one of them (`ODNI-UAP-D001`) carries a public correction note explaining the change. The other 68 file replacements are undocumented anywhere on war.gov.",
    significance: "This is a live, observable thing — anyone who downloaded the original May 8 / May 22 release ZIPs from war.gov now has different files than someone who downloads them today. The net delta is **1,162 MB removed** (2.31 GB → 1.09 GB across the affected files). 42 PDFs got smaller (re-compression), 22 got larger (re-OCR or added content), 3 changed by <1% (minor edits). Only the ODNI-UAP-D001 change is acknowledged in the public catalog. This is the kind of provenance question journalists and researchers should care about.",
    evidence: `**Method:** snapshot the public manifest and every asset URL on 2026-05-25; re-fetch each on 2026-05-27 via a Range request to recover the server-reported Content-Length, compare to the locally-stored byte size. Confirm any divergence with a full GET + md5.

**The one publicly-acknowledged change** (ODNI-UAP-D001 USPER Narrative):
The CSV's Description Blurb on the live site now ends with:
> *"May 26, 2026, correction: The document originally posted to the PURSUE collection of UAP-related records on May 22, 2026, under the name 'ODNI-UAP-D001, USPER Narrative, Senior USIC Official,' contained a typographic error in the second paragraph, describing a helicopter flight profile as 'map-of-the-earth.' The correct military aviation term for this profile is 'nap-of-the-earth.' This document has been updated to reflect this correction."*

The PDF went from **34,195 bytes → 58,516 bytes** (the correction note is rendered into the document itself).

**The 68 unannounced changes** include — but are not limited to:

• Every \`fbi-photo-b*.pdf\` (24 files). All shrank by roughly **80%** (e.g. \`fbi-photo-b1.pdf\` went from **613,116 → 126,599 bytes** — same filename, different MD5). Embedded image quality was lowered.
• Every \`65_hs1-834228961_62-hq-83894_section_*.pdf\` (10 sections). Most shrank dramatically; \`section_6\` went from **370 MB → 60 MB**. \`section_8\` went the *opposite* direction (120 MB → **255 MB** — added content).
• \`38_143685_box7_incident_summaries_173-233.pdf\` grew **3.3×** (49 MB → 161 MB). Whatever was added here is substantial.
• The State Department UAP cables (\`dos-uap-d1\`, \`dos-uap-d2\`) grew slightly — re-OCR pass.
• NASA transcripts (\`nasa-uap-d1\` Apollo 12, \`nasa-uap-d2\` Apollo 17) grew slightly.
• A subtle CSV-only edit on **DOW-UAP-PR072** (the Kazakhstan "ADMINISTRATIVE REVISION" video): the description was edited from "February 2022" to "**March 2022**" as the date the video was captured — no other change, no public note.

**Also fixed without acknowledgement:** the war.gov/UFO/ Open Graph description had mojibake on the apostrophe (\`governmentâ€™s\`). The live version now serves proper UTF-8 (\`government's\`). Silent fix.`,
    stats: [
      { big: "69", label: "files silently replaced" },
      { big: "1,162 MB", label: "net deletion" },
      { big: "42 / 22 / 3", label: "smaller / larger / approx-same" },
      { big: "1", label: "publicly-disclosed change" },
    ],
    comparisons: [
      {
        leftLabel: "Before (May 25, 2026)",
        leftValue: "fbi-photo-b1.pdf · 613,116 bytes · md5 0004971aa366cf2fbcbff1c032c2cb16",
        rightLabel: "After (May 27, 2026)",
        rightValue: "fbi-photo-b1.pdf · 126,599 bytes · md5 79ebf276f4a6a35126afd679a68f5f50",
      },
      {
        leftLabel: "Before — ODNI-UAP-D001 (May 22 release)",
        leftValue: "34,195 bytes — typo: 'map-of-the-earth' helicopter profile",
        rightLabel: "After — ODNI-UAP-D001 (May 26 correction)",
        rightValue: "58,516 bytes — corrected to 'nap-of-the-earth', notice rendered in-document",
      },
      {
        leftLabel: "DOW-UAP-PR072 description (cached)",
        leftValue: "...derived from a commercially available cellular device's rear-facing camera in **February 2022**.",
        rightLabel: "DOW-UAP-PR072 description (live)",
        rightValue: "...derived from a commercially available cellular device's rear-facing camera in **March 2022**.",
      },
    ],
    tables: [
      {
        caption: "Sample of unannounced replacements (selected)",
        headers: ["File", "Before (bytes)", "After (bytes)", "Δ"],
        rows: [
          { cells: ["65_hs1-834228961_62-hq-83894_section_6.pdf", "370,571,478", "60,929,949", "−83%"] },
          { cells: ["65_hs1-834228961_62-hq-83894_section_8.pdf", "120,391,107", "255,526,310", "+112%"] },
          { cells: ["38_143685_box7_incident_summaries_173-233.pdf", "49,382,924", "161,362,330", "+227%"] },
          { cells: ["38_143685_box7_incident_summaries_1-100.pdf", "247,087,612", "32,675,506", "−87%"] },
          { cells: ["18_6369445_general_1948_vol_1.pdf", "65,878,977", "4,740,807", "−93%"] },
          { cells: ["fbi-photo-b1.pdf", "613,116", "126,599", "−79%"] },
          { cells: ["fbi-photo-b13.pdf", "434,067", "66,245", "−85%"] },
        ],
      },
    ],
    sources: [
      { path: "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Live manifest; only ODNI-UAP-D001 has a correction note" },
      { path: "../before-resync/", note: "All 69 pre-correction files preserved locally in this archive (not committed; available on the maintainer's machine)" },
      { path: "https://www.war.gov/medialink/ufo/052226/release_02/documents/ODNI-UAP-D001_USPER_Narrative_Senior_USIC.pdf", note: "The one publicly-corrected PDF" },
      { path: "https://www.war.gov/medialink/ufo/release_1/fbi-photo-b1.pdf", note: "Sample of an unannounced replacement" },
    ],
    relatedRecordIds: ["pdf-odni-uap-d001-usper-narrative-senior-usic-official", "dvids-1007795"],
  },
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
  // ─────────────────────────────────────────────────────────────
  //  Release 3 (June 12, 2026) findings
  // ─────────────────────────────────────────────────────────────
  {
    id: "apollo16-alien-starbase-timecode",
    tier: 1,
    title: "AARO's own caption on a NASA tape: at 32:41, a scientist says \"Could be an alien starbase\"",
    claim: "The All-domain Anomaly Resolution Office's official description of NASA-UAP-D025 — released on June 12 as part of PURSUE — points to a specific timestamp where an Apollo 16 scientist on tape says, off-handedly, \"Could be an alien starbase or something, I don't know.\" That line is literally the reason this audio file was declassified.",
    significance: "The catalog UI shows you the bland title — \"Apollo 16 Scientific Debriefing\" — and nothing else. You only learn what's on the tape if you open the DVIDS metadata, which most readers never will. The quote is short, surprising, and from a presumably sober technical context (a NASA-internal debrief discussing experimental data correlations). It is the single most shareable line in any of the three PURSUE releases.",
    evidence: `The NASA-UAP-D025 audio file ships with the public title **\`NASA-UAP-D025, "Apollo 16 Scientific Debriefing"\`**. That's all the catalog tells you. The corresponding DVIDS API record — fetched per-video by the live site to render each modal — adds one sentence of context:

> *"At 32:41, the speaker makes an off-handed comment, **'Could be an alien starbase or something, I don't know'** when discussing correlations between experimental data sets."*

That's the entire description field. No speaker name, no surrounding transcript, no preceding minutes of context. AARO is essentially pointing at a timecode and saying *listen here*.

**A few things worth keeping straight:**

- **The speaker isn't identified.** Apollo 16 Scientific Debriefings (May 1972, immediately post-mission) featured the *principal investigators* of the various experiments, not the astronauts themselves. So the line was almost certainly spoken by an experiment PI — a scientist, not a crew member — and was reported off-hand while discussing data correlations.
- **The tone is "I don't know,"** not "this is one." This is the kind of half-joke a scientist drops when an unexplained signal pattern shows up. Calling that a "UAP encounter" stretches the term — but AARO clearly thought it was worth declassifying and timecoded.
- **The companion file**, NASA-UAP-D024, is also tagged \`"Apollo 16 Scientific Debriefing"\` (no timecode pointer in its description) — they're presumably two tracks or two sessions of the same series. D024 was published 2026-06-12; D025 was *quietly published one day earlier*, on 2026-06-11, alongside D023 (the Gordon Cooper / Cronkite interview — see [gordon-cooper-cronkite-1962](/findings/gordon-cooper-cronkite-1962)). The other seven release-3 DVIDS items all published on 6/12. Two-day staged upload.

**The DVIDS VIRIN** \`720501-D-D0360-5668\` confirms the imagery date — May 1, 1972 — three weeks after Apollo 16 splashed down on April 27, 1972.

**To verify yourself:** the file is at \`api.dvidshub.net/asset/video-1010336.json\` in this mirror. The original tape is on cloudfront at the link the JSON \`files[]\` array points to.`,
    stats: [
      { big: "32:41", label: "timecode AARO points to" },
      { big: "1 of 1", label: "release-3 NASA file with an explicit timecoded quote" },
      { big: "2026-06-11", label: "publish date (one day before the rest of release 3)" },
    ],
    comparisons: [
      {
        leftLabel: "Catalog title (what users see)",
        leftValue: "NASA-UAP-D025, \"Apollo 16 Scientific Debriefing\"",
        rightLabel: "DVIDS description (what AARO actually says about it)",
        rightValue: "At 32:41, the speaker makes an off-handed comment, 'Could be an alien starbase or something, I don't know' when discussing correlations between experimental data sets.",
      },
    ],
    sources: [
      { path: "api.dvidshub.net/asset/video-1010336.json", note: "Full DVIDS record — the description is the entire payload here" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Catalog row — has only the title, no description" },
      { path: "api.dvidshub.net/asset/video-1010319.json", note: "NASA-UAP-D024 — the companion Apollo 16 Scientific Debriefing file" },
    ],
    relatedRecordIds: ["dvids-1010336", "dvids-1010319"],
  },
  {
    id: "gordon-cooper-cronkite-1962",
    tier: 1,
    title: "PURSUE includes a 1962 Walter Cronkite interview with astronaut Gordon Cooper about UFOs",
    claim: "NASA-UAP-D023 is a previously-unsurfaced excerpt from a November 1962 CBS interview, conducted by Walter Cronkite, in which Mercury 9 astronaut Gordon Cooper gives his views on unidentified flying objects. The catalog shows only the title; the DVIDS record tells you the topic.",
    significance: "Cooper went on to be one of the most publicly outspoken U.S. astronauts on the UFO subject — testifying before the UN in 1985 and granting decades of interviews. This 1962 Cronkite excerpt is the earliest known on-tape version of his views. It being included in a Pentagon disclosure release is itself the story.",
    evidence: `The catalog row reads, simply: **\`NASA-UAP-D023, Interview Excerpt with Astronaut Gordon Cooper, 1962\`**. The DVIDS record fills in what the tape actually contains:

> *"In November 1962, journalist Walter Cronkite interviewed astronaut Gordon Cooper. In this excerpt from that interview, Cronkite asks Cooper about his views regarding the nature of unidentified flying objects, having previously expressed an interest in the subject. Cooper opines that 'a large number…"*

The DVIDS description gets truncated mid-quote — AARO's own metadata system cuts off Cooper's actual line. The full audio is on cloudfront via the JSON \`files[]\` reference; the truncated quote is what makes the description so interesting.

**Context that the catalog doesn't give you:**

- **November 1962.** Cooper's first spaceflight (Mercury-Atlas 9, *Faith 7*) wasn't until May 1963. So this interview happened *six months before he flew*, when Cronkite would have been previewing the Mercury program. Cooper was already publicly known as the only Mercury Seven astronaut openly interested in UFOs at the time.
- **VIRIN** \`621101-D-D0360-5375\` confirms the November 1, 1962 imagery date.
- **Published 2026-06-11** — one day before the rest of release 3 dropped, alongside NASA-UAP-D025 (the Apollo 16 "alien starbase" item — see [apollo16-alien-starbase-timecode](/findings/apollo16-alien-starbase-timecode)). Whoever staged the release pushed the two NASA audio items the night before everything else.

**Why this is in PURSUE at all.** Cooper had already given public UFO interviews on tape before 1962. The genuinely novel thing here is that the *Department of War* — through AARO — formally redistributed this clip as a UAP-related historical record, with its own UAP record ID. They're not declaring it new footage. They're using their declassification venue to assemble a canonical reference set of UFO-related audio across NASA history. The Gemini and Apollo tapes from release 3 (NASA-UAP-D015–D022, D024–D025) do the same.`,
    stats: [
      { big: "Nov 1962", label: "interview date (6 months before Cooper's Mercury 9 flight)" },
      { big: "8", label: "other NASA audio/video items in release 3 (Gemini + Apollo)" },
    ],
    sources: [
      { path: "api.dvidshub.net/asset/video-1010337.json", note: "DVIDS record — full description (truncates Cooper's quote mid-sentence)" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Catalog row — title only" },
    ],
    relatedRecordIds: ["dvids-1010337"],
  },
  {
    id: "colorado-springs-potato",
    tier: 1,
    title: "AARO's verdict on the 2022 Colorado Springs UAP: \"angular, non-symmetrical potato,\" probably sunlight on snow",
    claim: "The Intelligence Community Agency analysis of the 2022 Colorado Springs incident — released as ICA-UAP-D001 — characterises the witnessed object as \"an angular, non-symmetrical potato\" and resolves it, with low confidence, as sunlight backscattering off snow on the mountains, illuminating the underside of low-altitude clouds. This is one of the very few cases in any of the three PURSUE releases where AARO offers an actual explanation.",
    significance: "Most of the 294 PURSUE records are flagged \"unresolved.\" When AARO does conclude something, it's worth reading exactly how they hedge — and \"angular, non-symmetrical potato\" is, frankly, an unforgettable phrase. The Colorado Springs cluster also shows AARO's idea of a *complete* case file: a witness's FBI form (FD-1057), an analyst's digital rendering of what the witness described, and a separate IC partner's atmospheric analysis. Three documents about one ten-second incident.",
    evidence: `The cluster as released:

- **FBI-UAP-D001** — FD-302 form (the FBI's standard witness-interview record). 2022, Colorado Springs.
- **FBI-UAP-D002** — FD-1057 (FBI investigative-activity form), same 2022 Colorado Springs report. Contains the witness's first-hand narrative.
- **FBI-UAP-D003** — Digital Rendering: an artistic interpretation of the 2022 incident, derived from the witness's narrative description in D002.
- **ICA-UAP-D001** — the IC partner's actual analytical assessment.

The live carousel caption for ICA-UAP-D001 (visible only when you hover the slideshow image) reads:

> *"An AARO IC partner assessed, with low confidence, that the reported phenomenon, which observers characterized as resembling an 'angular, non-symmetrical potato,' was attributable to sunlight backscattering, where sunlight reflecting from mountain snow cover illuminated the underside of low-altitude clouds."*

**Three observations:**

1. **The phrase isn't an analyst's joke.** "Angular, non-symmetrical potato" is the *witness's* description, repeated back in the IC report. That implies the FD-1057 narrative literally contains the word "potato." (FBI-UAP-D002 is the original; the rendering in D003 is the analyst's attempt to draw what they meant.)

2. **"Low confidence."** Even the favorable atmospheric explanation is hedged. AARO IC partners use \`low / medium / high\` confidence on conclusions. "Low" here means they're saying *this would explain it if you accept several assumptions about angle, cloud altitude, and snow extent.* Not "this is the answer."

3. **The "IC partner" framing.** The document is labelled \`ICA-UAP-D001\` — Intelligence Community Agency — which is AARO's way of saying *one of the IC agencies, not AARO itself.* They don't say which agency. So even the explanation is one step removed from AARO's own analysis.

**Cross-link.** The Western United States Event cluster (release 3's other multi-doc incident — see [western-us-event-cluster](/findings/western-us-event-cluster)) follows the same template: narratives + renderings + analysis, but with no resolution at all. Colorado Springs is the only Tier-1 release-3 incident with an explanation attached.`,
    stats: [
      { big: "4", label: "documents about one incident (FBI-D001, D002, D003 + ICA-D001)" },
      { big: "Low", label: "AARO's confidence level on its own explanation" },
      { big: "1", label: "release-3 incident with an offered resolution" },
    ],
    comparisons: [
      {
        leftLabel: "Witness's description (per ICA report)",
        leftValue: "An angular, non-symmetrical potato",
        rightLabel: "AARO IC partner's verdict",
        rightValue: "Likely sunlight backscattering off snow cover, illuminating clouds (low confidence)",
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/ICA-UAP-D001_Analysis_Colorado-Springs-UAP-Incident.pdf", note: "The atmospheric analysis itself" },
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/FBI-UAP-D002_FD-1057_Unresolved-UAP-Report_ColoradoSprings_2022.pdf", note: "FBI FD-1057 witness narrative — the source of the 'potato' phrasing" },
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/FBI-UAP-D003_Digital-Rendering_Unresolved-UAP-Report_ColoradoSprings_2022.pdf", note: "Analyst's digital rendering from the witness's description" },
      { path: "www.war.gov/UFO/index.html", note: "Live carousel — slideshow caption containing the 'potato' / 'sunlight backscattering' quote" },
    ],
  },
  {
    id: "western-us-event-cluster",
    tier: 1,
    title: "The \"Western US Event\" — release 3's largest single incident, 21 cross-linked records",
    claim: "Twenty-one of release 3's 72 records describe one incident. The catalog presents them as 21 separate entries; structurally they're one event — two consecutive days near a sensitive national security site, with first-hand narratives from federal witnesses, two FBI video reconstructions, and ten digital renderings split across two sub-incidents.",
    significance: "The Western US Event is the most heavily-documented single incident in any of the three PURSUE releases — more documents than the Iran 4-UAP formation (release 2), the F-16C Lake Huron shootdown (release 2), or any release-1 case. The Department of War teased it back in release 1 with a slide deck (\`western_us_event_slides_5.08.2026.pdf\`); release 3 is where the underlying source documents drop. The catalog UI doesn't surface the cluster as a navigable unit, which is what makes this finding useful.",
    evidence: `**Cluster composition** (21 records — 22 if you count the release-1 slide deck callback):

**Analysis layer (DOW):**
- \`DOW-UAP-D077\` — Unresolved Case Analysis Update, Western United States Event
- \`DOW-UAP-D078\` — Notional Map, Western United States Event

**Narratives 1–5 (DOW):**
- \`DoW-UAP-D079\` — Narrative 1
- \`DoW-UAP-D080\` — Narrative 2
- \`DoW-UAP-D081\` — Narrative 3
- \`DoW-UAP-D082\` — Narrative 4
- \`DoW-UAP-D083\` — Narrative 5

**FBI digital renderings of Incident 1:**
- \`FBI-UAP-D014\` — Incident 1-1
- \`FBI-UAP-D015\` — Incident 1-2
- \`FBI-UAP-D021\` — Incident 1-3

**FBI digital renderings of Incident 2:**
- \`FBI-UAP-D016\` — Incident 2-1
- \`FBI-UAP-D017\` — Incident 2-2
- \`FBI-UAP-D018\` — Incident 2-3
- \`FBI-UAP-D019\` — Incident 2-4
- \`FBI-UAP-D020\` — Incident 2-5
- \`FBI-UAP-D022\` — Incident 2-6
- \`FBI-UAP-D023\` — Incident 2-7

**FBI video reconstructions:**
- \`FBI-UAP-PR005\` — Digital Recreation, Narrative Statement 3-1, Western United States Event, 2023 ([DVIDS 1010272](api.dvidshub.net/asset/video-1010272.json))
- \`FBI-UAP-PR006\` — Digital Recreation, Narrative Statement 3-2, Western United States Event, 2023 ([DVIDS 1010276](api.dvidshub.net/asset/video-1010276.json))

**What the DVIDS records say.** Both FBI-UAP-PR005 and PR006 are described as:

> *"An artistic interpretation of a reported incident near a sensitive national security site in the western United States involving unidentified anomalous phenomena (UAP) over a period of two days in 2023…based upon a first-hand description provided by a federal…"*

(AARO truncates the description mid-sentence — the word after "federal" is presumably "employee" or "agent.")

**What we can read between the lines:**

1. **Two incidents on two consecutive days in 2023**, near a *sensitive national security site* in the western US. AARO is careful never to name the site — but the volume of documentation and the FBI's involvement implies federal jurisdiction.
2. **At least five first-hand narrators** (D079–D083 = Narrative 1 through Narrative 5). The FBI's PR005 and PR006 reconstructions reference "Narrative Statement 3-1" and "3-2" — so Narrator 3 alone gave at least two separate statements about two separate moments.
3. **Incident 1 had three sub-moments** (1-1, 1-2, 1-3 = three renderings).
4. **Incident 2 had seven sub-moments** (2-1 through 2-7).
5. **The DOW provides analysis and a notional map**; the FBI handles the witness interviews and reconstructions. The agencies divided labour the same way they did on Colorado Springs (see [colorado-springs-potato](/findings/colorado-springs-potato)) — except this case is *not* resolved.

**The release-1 callback.** Back in May 8, the DoW released \`western_us_event_slides_5.08.2026.pdf\` (in \`medialink/ufo/release_1/\`) — a slide deck that mentioned the Western US Event but didn't include the underlying source files. Five weeks later, release 3 delivers them. That makes this the only multi-release case in the entire PURSUE corpus.`,
    stats: [
      { big: "21", label: "release-3 records about one event" },
      { big: "2", label: "consecutive days in 2023" },
      { big: "5+", label: "first-hand witness narrators" },
      { big: "1+1+1", label: "case-analysis / notional-map / video reconstructions" },
    ],
    tables: [
      {
        caption: "Cluster index — 22 cross-release documents",
        headers: ["Record ID", "Layer", "Role"],
        rows: [
          { cells: ["western_us_event_slides_5.08.2026.pdf", "Release 1 (May 8)", "Original slide deck — teased the event"] },
          { cells: ["DOW-UAP-D077", "Release 3 — Analysis", "Unresolved Case Analysis Update"] },
          { cells: ["DOW-UAP-D078", "Release 3 — Analysis", "Notional Map"] },
          { cells: ["DoW-UAP-D079..D083", "Release 3 — Witness narratives", "Narratives 1 through 5 (5 docs)"] },
          { cells: ["FBI-UAP-D014, D015, D021", "Release 3 — FBI renderings", "Incident 1, sub-moments 1, 2, 3"] },
          { cells: ["FBI-UAP-D016..D020, D022, D023", "Release 3 — FBI renderings", "Incident 2, sub-moments 1 through 7 (7 docs)"] },
          { cells: ["FBI-UAP-PR005", "Release 3 — Video reconstruction", "Digital Recreation of Narrator 3, Statement 1"] },
          { cells: ["FBI-UAP-PR006", "Release 3 — Video reconstruction", "Digital Recreation of Narrator 3, Statement 2"] },
        ],
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/release_1/western_us_event_slides_5.08.2026.pdf", note: "Original release-1 slide deck — the teaser" },
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents", note: "All 21 release-3 cluster documents live in this directory" },
      { path: "api.dvidshub.net/asset/video-1010272.json", note: "FBI-UAP-PR005 — Narrator 3, Statement 1 video reconstruction" },
      { path: "api.dvidshub.net/asset/video-1010276.json", note: "FBI-UAP-PR006 — Narrator 3, Statement 2 video reconstruction" },
    ],
  },
  {
    id: "kardashev-sakharov-on-ufos",
    tier: 1,
    title: "Release 3 includes a CIA-held paper on UFOs jointly authored by Kardashev and Sakharov",
    claim: "Buried in release 3's CIA Cold War file dump is CIA-UAP-008: a speculative paper on unidentified flying objects co-authored by Nikolai Kardashev — the Soviet astronomer who created the Kardashev Scale of civilizations — and Andrei Sakharov, the Soviet H-bomb physicist who won the 1975 Nobel Peace Prize for human-rights work.",
    significance: "Two of the most celebrated Soviet scientists of the 20th century, jointly writing speculatively on UFOs, held in CIA files since the Cold War, now public. The combination of authors alone makes this a noteworthy item independent of what the paper actually concludes. The catalog file name is the only place where their names appear — they're not in the title, not in the description, not in the carousel.",
    evidence: `The catalog row points at a single PDF:

\`\`\`
medialink/ufo/061226/release_03/documents/
  CIA-UAP-008_SPECULATIVE_PAPER_BY_N_KARDASHEV_AND_A_SAKHAROV.pdf
\`\`\`

That's the entire surfaced identification — the filename itself.

**Who they are.**

- **Nikolai Kardashev (1932–2019)** — Soviet/Russian astrophysicist; in 1964 he proposed the *Kardashev Scale*, the canonical framework for ranking hypothetical civilizations by their energy use (Type I planetary, Type II stellar, Type III galactic). The scale is referenced constantly in modern SETI and astrobiology work.
- **Andrei Sakharov (1921–1989)** — lead designer of the Soviet hydrogen bomb (1953), later turned dissident; awarded the Nobel Peace Prize in 1975 for human-rights work. His name on a UFO speculation paper is the surprising part — Sakharov was a pure-physics theorist with no public association with the UFO field.

**Surrounding context in the same release.** CIA-UAP-008 sits inside a cluster of 18 historical CIA Cold War UFO files (CIA-UAP-002 through CIA-UAP-019) — the largest single-agency dump in PURSUE so far. The cluster includes:
- \`CIA-UAP-002\` — Robertson Scientific Advisory Panel Report, 1952–1953 (the famous panel)
- \`CIA-UAP-003\` — CIA / Overhead Reconnaissance: U-2 & OXCART Programs 1954–1974 (see [cia-uap-003-u2-oxcart-720mb](/findings/cia-uap-003-u2-oxcart-720mb))
- \`CIA-UAP-010\` — Report on Conversations with Soviet Scientists on the Subject of Unidentified Flying Objects in the USSR (likely the Kardashev/Sakharov companion piece)
- \`CIA-UAP-011\` — The Sary Shagan Weapons Testing Range
- \`CIA-UAP-014\` — British Activity in the Field of Unidentified Flying Objects
- \`CIA-UAP-015\` — Project Blue Book Special Report No. 14
- \`CIA-UAP-019\` — Australian DoD Scientific and Intelligence Aspects of the UFO Problem

The Kardashev/Sakharov paper is a single thread in what amounts to the CIA's Cold War file on *everyone else's* UFO research — Soviet, British, Australian, Hungarian, Indian (CIA-UAP-016 is about Ladakh / Nepal / Sikkim / Bhutan sightings), and Zimbabwean (see [harare-airport-zimbabwe-2008](/findings/harare-airport-zimbabwe-2008)).

**What to watch for if you actually open the PDF.** Speculative papers held in CIA archives are typically translations of Soviet open-literature publications — picked up by CIA's Foreign Broadcast Information Service or similar. The filename's "SPECULATIVE PAPER" framing is doing a lot of work; it implies the CIA's own categorization of the document, not its title. The actual paper may well be a published 1970s-80s Soviet astrophysics piece about extraterrestrial intelligence (Kardashev was an early SETI proponent), now declassified under PURSUE because of its UFO subject overlap.`,
    sources: [
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-008_SPECULATIVE_PAPER_BY_N_KARDASHEV_AND_A_SAKHAROV.pdf", note: "The paper itself — names visible only in the filename" },
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-010_REPORT_ON_CONVERSATIONS_WITH_SOVIET_SCIENTISTS_ON_SUBJECT_OF_UNIDENTIFIED_FLYING_OBJECTS_IS_THE_USSR.pdf", note: "The likely companion piece — CIA report on Soviet scientist conversations on UFOs" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Catalog rows for CIA-UAP-008 and CIA-UAP-010" },
    ],
  },
  {
    id: "cia-uap-003-u2-oxcart-720mb",
    tier: 1,
    title: "The largest file in PURSUE is the CIA's own U-2 and OXCART history",
    claim: "CIA-UAP-003 — at roughly 720 MB the single biggest PDF in any PURSUE release — is the CIA's internal history of the U-2 and OXCART (A-12 / SR-71) reconnaissance programs from 1954 to 1974. This is the document that long established that many Cold War UFO sightings were classified overflights. Its inclusion under PURSUE is the official acknowledgement of that overlap.",
    significance: "This file isn't new — versions of it have been declassified for years and the original was famously released by the CIA in 2013 as part of Operation HABRINK. What's new is that the *Department of War* in 2026 has re-released it specifically under a UFO disclosure venue, with a UAP record ID assigned (\"CIA-UAP-003\"). That's the Pentagon formally endorsing the explanation that has always been controversial inside UFO communities: that the U-2 and SR-71 are responsible for a non-trivial share of historical Cold War UFO reports.",
    evidence: `**Catalog row:** \`CIA-UAP-003-THE_CENTRAL_INTELLIGENCE_AGENCY_AND_OVERHEAD_RECONNAISSANCE-THE_U-2_AND_OXCART_PROGRAMS_1954-1974\`

**File path:** \`medialink/ufo/061226/release_03/documents/CIA-UAP-003-THE_CENTRAL_INTELLIGENCE_AGENCY_AND_OVERHEAD_RECONNAISSANCE-THE_U-2_AND_OXCART_PROGRAMS_1954-1974.pdf\`

**Size:** ~720 MB. By comparison the second-largest file in release 3 (\`CIA-UAP-015\`, Project Blue Book Special Report No. 14) is ~80 MB. The mean release-3 PDF is ~3 MB. This one file accounts for about 80% of release 3's total document bundle weight.

**Why it's relevant to UFOs.** The U-2 (CIA, 1955+) flew at 70,000 ft. The A-12 / OXCART (CIA, 1962+) cruised at 90,000 ft at Mach 3+. The SR-71 (USAF successor, 1966+) flew the same envelope. Until SR-71 retirement in 1989, the U-2 and successors flew higher than any aircraft civilian observers thought was possible. A *significant fraction* of 1950s–80s "high-altitude UFO" reports — silver dots crossing the sky at unbelievable speeds, no engine noise — are explained by this single document.

**The CIA's own 1998 acknowledgement** (in *Studies in Intelligence*, the in-house journal) put a number on it: that *over half* of UFO reports between the mid-1950s and the mid-1960s were "of U-2 or OXCART flights." That number has been repeated in every serious UFO history since.

**Why republishing it under PURSUE matters.**

1. The Department of War assigning it a **UAP record ID** is the Pentagon's first formal classification of this document as primary UFO source material since AARO was established.
2. Release 3 is heavily *historical* — 18 CIA Cold War files, plus 1940s DoW Flying Saucer Studies (D084 Army 1949, D086 Navy 1948), plus J. Edgar Hoover correspondence from 1949. The U-2/OXCART history fits that frame: PURSUE is reclassifying the Cold War overflight programs as part of the UFO record.
3. Releasing it via PURSUE rather than the CIA's own FOIA reading room (where it's been since 2013) gives it a UAP-context filename, a UAP-context catalog entry, and inclusion in the DoW's master UFO manifest.

**To download:** the file is huge. Either the release-3 documents bundle (826 MB total — see [bundles](/bundles)) or this specific PDF at \`www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-003-THE_CENTRAL_INTELLIGENCE_AGENCY_AND_OVERHEAD_RECONNAISSANCE-THE_U-2_AND_OXCART_PROGRAMS_1954-1974.pdf\`. We mirror it locally; we recommend not inlining it on a record page (use a download link only).`,
    stats: [
      { big: "~720 MB", label: "single file size — largest in all 3 releases" },
      { big: "~80%", label: "of release 3 document bundle weight" },
      { big: "1954–1974", label: "coverage period" },
      { big: ">50%", label: "of 1950s–60s UFO reports the CIA itself attributes to U-2/OXCART" },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-003-THE_CENTRAL_INTELLIGENCE_AGENCY_AND_OVERHEAD_RECONNAISSANCE-THE_U-2_AND_OXCART_PROGRAMS_1954-1974.pdf", note: "The file itself (~720 MB)" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Catalog row" },
    ],
  },
  {
    id: "harare-airport-zimbabwe-2008",
    tier: 1,
    title: "Hidden in a bureaucratically-titled CIA file: a 2008 UFO report at Harare International Airport",
    claim: "CIA-UAP-017 is catalogued under the title \"Placement on High Alert Due to Perceived Aggressive Foreign Posturing\" — innocuous bureaucratese. The live carousel caption, visible only on hover, says it's actually \"a never before released July 2008 report on a UFO sighting at the Harare International Airport.\" The catalog title is what shows up in search engines; the carousel caption is what tells you what's in the file.",
    significance: "Without the carousel caption, nobody searching for \"Harare UFO 2008\" would find this. The mismatch between the catalog title and the actual content is a textbook example of how the public-facing search UX can hide the most interesting documents in plain sight — the file is fully public, but its title is deliberately uninformative.",
    evidence: `**On the official catalog**, the record reads:

\`\`\`
Title:     CIA-UAP-017, Placement on High Alert Due to Perceived Aggressive Foreign Posturing
Agency:    CIA
Release:   6/12/26
File:      CIA-UAP-017_Placement_on_High_Alert_Due_to_Perceived_Aggressive_Foreign_Posturing.pdf
\`\`\`

Nothing about Zimbabwe. Nothing about Harare. Nothing about an airport. Nothing about 2008.

**On the live PURSUE carousel** (one of the ten featured release-3 images), CIA-UAP-017 is the first slide. Its \`data-lightbox-sentence\` attribute — the on-hover description — reads:

> *"A never before released July 2008 report on a UFO sighting at the Harare International Airport."*

And the slideshow image's alt text reads:

> *"A document with routing information and the topic 'ZIMBABWE'."*

So the carousel knows. The catalog UI doesn't.

**Where the words come from.** \`Placement on High Alert Due to Perceived Aggressive Foreign Posturing\` is almost certainly the original 2008 CIA cable's subject line — the kind of bureaucratically-armored language used when the actual subject (a UFO at an international civilian airport) would attract attention. The filename and the catalog title both inherited the original subject line. The carousel caption was written by whoever staged the release and knew what the document actually contained.

**Why the mismatch matters for the public.** Someone looking for "Zimbabwe UFO disclosure" via Google can't find this. Someone searching the live catalog UI for "Harare" turns up zero results. Someone clicking through the live carousel and hovering on the first slide does find it — but most readers don't hover on carousel images.

**Cross-reference.** This isn't the only release-3 document with a content-vs-title mismatch — see [colorado-springs-potato](/findings/colorado-springs-potato), where the catalog says "ICA-UAP-D001 Analysis: Colorado Springs UAP Incident, 2022" but the carousel caption is the one that reveals the "angular, non-symmetrical potato" detail. Carousel captions are doing real work in release 3 that the catalog titles don't.

**Verify.** Hover on the first carousel slide on the live \`/UFO/\` page, or read the captured \`data-lightbox-sentence\` attribute in the saved \`www.war.gov/UFO/index.html\` in this mirror.`,
    comparisons: [
      {
        leftLabel: "What the catalog calls it",
        leftValue: "CIA-UAP-017, Placement on High Alert Due to Perceived Aggressive Foreign Posturing",
        rightLabel: "What the carousel caption says it actually is",
        rightValue: "A never before released July 2008 report on a UFO sighting at the Harare International Airport",
      },
    ],
    sources: [
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-017_Placement_on_High_Alert_Due_to_Perceived_Aggressive_Foreign_Posturing.pdf", note: "The document itself" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/061226/Rotator/CIA-UAP-017_Placement_on_High_Alert_Due_to_Perceived_Aggressive_Foreign_Posturing.jpg", note: "Carousel slideshow image — alt text mentions 'ZIMBABWE'" },
      { path: "www.war.gov/UFO/index.html", note: "Live page — search for the 'never before released July 2008 report' string" },
    ],
  },
  {
    id: "cia-uap-005-literal-space-in-path",
    tier: 2,
    title: "One release-3 file URL has a literal space in it — and a regular fetch returns 404",
    claim: "CIA-UAP-005 \"German scientists' article on flying discs\" is referenced in the live PURSUE manifest at a URL with a literal space between two underscores. Standard fetch tools that don't URL-encode the space as %20 receive a 404 from war.gov. The file is public, the catalog row works in a browser, but anyone trying to mirror or programmatically download the file from a script has to know to URL-encode.",
    significance: "Practically, it means: (1) the catalog isn't validated against the actual file URLs before publication; (2) automated archivers (Internet Archive, FOIA-tracker bots) may silently fail to mirror this specific record; (3) it's the same hygiene pattern that broke release 1's `18_100754_ general 1946-7_vol_2.pdf` and `serial 5 redacted_redacted.pdf`. Three releases in, the manifest still ships filenames with literal spaces.",
    evidence: `The manifest references the URL:

\`\`\`
medialink/ufo/061226/release_03/documents/CIA-UAP-005-German_scientists_ article_on_flying_discs.pdf
\`\`\`

Note the space character between \`scientists_\` and \`article\` — that's not a rendering artifact, it's a literal \` \` byte in the path on the server.

**Direct fetch tests:**

\`\`\`
GET .../CIA-UAP-005-German_scientists_%20article_on_flying_discs.pdf    →  200 OK  (1,107,431 bytes)
GET .../CIA-UAP-005-German_scientists_article_on_flying_discs.pdf       →  404
GET .../CIA-UAP-005-German_scientists_+article_on_flying_discs.pdf      →  404
GET .../CIA-UAP-005-German_Scientists_Article_on_Flying_Discs.pdf       →  404
\`\`\`

Only the URL-encoded space resolves. Browsers handle this automatically because they URL-encode spaces in href attributes before issuing the request. Raw \`curl\` or \`wget\` against the catalog-listed URL does *not*. Quietly, this means anyone scripting against the manifest gets exactly one missing file.

**The pattern across all three releases:**

| Release | File with literal-space filename |
|---|---|
| Release 1 | \`18_100754_ general 1946-7_vol_2.pdf\` (leading space inside the filename) |
| Release 1 | \`serial 5 redacted_redacted.pdf\` (filename uses spaces, not hyphens) |
| Release 3 | \`CIA-UAP-005-German_scientists_ article_on_flying_discs.pdf\` (embedded space) |

Three releases, three different filename-hygiene failures. The CIA-UAP-005 case is the worst of the three because it's the only one where the catalog actively references the broken URL.

**The companion thumbnail** at \`thumbnails/CIA-UAP-005-German_scientists_ article_on_flying_discs.jpg\` has the same problem — fetches only with \`%20\`.

**The file itself.** Once you get past the URL: it's a 1.1 MB scan of a German-language article on "flying discs," held in CIA archives. It's catalogued under release 3's broader CIA Cold War file dump (alongside CIA-UAP-002 through CIA-UAP-019). Worth opening; not the point of this finding.`,
    sources: [
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents/CIA-UAP-005-German_scientists_ article_on_flying_discs.pdf", note: "Locally mirrored under the literal-space filename" },
      { path: "www.war.gov/Portals/1/Interactive/2026/UFO/uap-data.csv", note: "Catalog row referencing the broken URL" },
    ],
  },
  {
    id: "tradecraft-cleanup-in-release-3",
    tier: 1,
    title: "Release 3 fixed every metadata leak that defined releases 1 and 2",
    claim: "Comparing the metadata profile of release 3 (June 12) against releases 1 and 2 (May 8 and May 22), every category of Tier-1 finding from the first two releases — PDF title mismatches, named individuals in video credits, placeholder VIRINs, city-level location leaks, scanner fingerprint variety — drops to zero in release 3. The Department of War's metadata-scrubbing process measurably tightened between releases.",
    significance: "This is the most interesting finding *about* PURSUE rather than *within* it. Releases 1 and 2 leaked operational tradecraft through PDF metadata, DVIDS records, and orphaned filenames — that's why findings 2 through 13 exist. Release 3 has zero of those leaks. Either someone at the DoW publishing pipeline reads pages like this one and tightened the process, or they got better the second time on their own. Either way: it tells you future PURSUE releases will be cleaner than the first two, and that the historical record-of-record for this release program is the *first two* releases, not the most recent one.",
    evidence: `Counts come from per-release analysis of every PDF (\`/Title\`, \`/Creator\`, \`/Producer\`, \`/Author\` fields via PyMuPDF) and every DVIDS video JSON in the mirror.`,
    stats: [
      { big: "0", label: "release-3 PDFs with /Title mismatching catalog (vs 35+ in R1+R2)" },
      { big: "0", label: "release-3 videos with city-level location (vs 1 in R1+R2)" },
      { big: "0", label: "release-3 videos with a named credit (vs 1 in R1+R2)" },
      { big: "0", label: "release-3 videos with a non-AARO VIRIN code (vs 1 in R1+R2)" },
      { big: "0", label: "release-3 orphan PDFs on disk not in catalog (vs 4 in R1+R2)" },
    ],
    tables: [
      {
        caption: "Metadata leak indicators, before-and-after",
        headers: ["Indicator", "Release 1 + 2", "Release 3"],
        rows: [
          { cells: ["PDFs with /Title disagreeing with public catalog title", "35+ (incl. D20 country/year, Cable 2 Tajikistan, all D→PR relabels, all NARA shelfmarks)", "0"] },
          { cells: ["Distinct /Creator values (scanner/tool fingerprints)", "13 (HP 9100C, ScanSnap SV600, PaperStream 5.1, LuraDocument, Photoshop, Acrobat, Word, PowerPoint, PScript5.dll, PaperStream Capture, Aspose, PFU PDF Engine, macOS Quartz)", "3 (Microsoft Word, PaperStream ClickScan 1.4.0.3, empty)"] },
          { cells: ["Distinct /Producer values", "10 (incl. macOS Quartz PDFContext AppendMode 1.1, Aspose Pty Ltd., Adobe Photoshop, PFUPDF Engine 1.3.10 + 1.3.80)", "2 (Acrobat Paper Capture Plug-in, empty)"] },
          { cells: ["Videos with city-level location", "1 of 85 (PR073 Columbus OH — see Finding 4)", "0 of 9"] },
          { cells: ["Videos with a named credit (vs \"Courtesy\")", "1 of 85 (Edward Pajak — see Finding 4)", "0 of 9"] },
          { cells: ["Videos with non-AARO VIRIN unit code", "1 of 85 (XX999 placeholder — see Finding 4)", "0 of 9 (all D0360 = AARO)"] },
          { cells: ["Orphan PDFs on disk, not in live manifest", "4 (including the D20 rename leak and the bracketed-vs-unbracketed dupes)", "0"] },
        ],
      },
    ],
    sources: [
      { path: "C:/Users/theri/AppData/Local/Temp/analyze_release3.py", note: "Source script for the release-3 PDF metadata sweep" },
      { path: "C:/Users/theri/AppData/Local/Temp/dvids_rel3.py", note: "Source script for the release-3 DVIDS sweep" },
      { path: "C:/Users/theri/AppData/Local/Temp/rel3_orphans2.py", note: "Source script for the case-insensitive disk-vs-catalog reconciliation" },
      { path: "www.war.gov/medialink/ufo/061226/release_03/documents", note: "All 52 release-3 PDFs analysed" },
      { path: "api.dvidshub.net/asset", note: "9 release-3 DVIDS JSONs (video-1010263, 1010264, 1010267, 1010269, 1010272, 1010276, 1010319, 1010336, 1010337)" },
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
  {
    id: "placeholder-footer-links",
    tier: 2,
    title: "Two literal “Place Holder” links shipped live in the war.gov homepage footer",
    claim: "Two `<a href=\"#\">Place Holder</a>` links sit in the rendered war.gov homepage footer. Devs forgot to fill in two nav slots and the placeholder text shipped to production.",
    significance: "Visible in every page load of the most-visited Department of War page. Easiest possible verification: view source on war.gov, search “Place Holder”.",
    evidence: `Direct from the homepage source:

\`\`\`html
<a href="#">Place Holder</a>
<a href="#">Place Holder</a>
\`\`\`

Two instances — almost certainly the mobile-display and desktop-display variants of the same nav slot. Both render as clickable text in the footer area that does nothing when clicked (href="#" scrolls to the top of the page).

The same homepage source ships with 13 surviving "DOD" references (the agency renamed to "Department of War" but the markup wasn't fully purged) and 14 instances of the \`noopeneer\` typo — this fits a pattern of partial cleanup.`,
    stats: [
      { big: "2", label: "“Place Holder” links live in footer" },
      { big: "203 KB", label: "homepage HTML size" },
    ],
    sources: [
      { path: "https://www.war.gov/", note: "View source, search “Place Holder”" },
    ],
  },
  {
    id: "noopeneer-typo",
    tier: 2,
    title: "rel=“noopeneer noreferrer” — typo appears 14× on the war.gov homepage",
    claim: "Every external link on the war.gov homepage uses `rel=\"noopeneer noreferrer\"`. The correct attribute is `noopener`. The typo got copy-pasted into the template and shows up 14 times.",
    significance: "Minor security regression they don’t know about. Browsers ignore the unknown `noopeneer` token and fall back to `noreferrer` only — which means external sites the user navigates to can still touch `window.opener` and trigger reverse tab-napping if a malicious link were ever embedded.",
    evidence: `Searching the homepage HTML for the literal string \`noopeneer\` returns 14 matches. Every one is in a \`<a rel="noopeneer noreferrer" ...>\` external link.

The intended attribute is \`noopener\`. From MDN: *"Without this, the new page can use \`window.opener\` to redirect your page to a phishing URL."* Browsers don’t throw an error on unknown rel tokens — they silently ignore them — so the typo is functionally equivalent to never having added the protection at all.

The same typo is noted as a sub-bullet in finding \`html-curios\` for the /UFO/ page; counting across war.gov, it’s pervasive.`,
    stats: [
      { big: "14×", label: "occurrences on homepage" },
      { big: "0", label: "occurrences of correct `noopener`" },
    ],
    sources: [
      { path: "https://www.war.gov/", note: "Homepage HTML — grep for noopeneer" },
    ],
  },
  {
    id: "dod-rename-vestiges",
    tier: 2,
    title: "The Department of Defense → Department of War rename is half-finished in markup",
    claim: "Despite the public rebrand to “Department of War,” the war.gov homepage HTML still contains 13 “DOD” references, hosts every image from `media.defense.gov`, and lists both `DoW` and `DOW` capitalizations in its meta keywords.",
    significance: "The rebrand is more press-release than infrastructure. Petabytes of imagery (general portraits, banners, press photos) still live on the old DoD media host — moving them is expensive and breaks years of inbound links. Open the page-source on any war.gov page and the legacy identity is right there.",
    evidence: `**On the homepage HTML:**
• 13 surviving references to the string \`DOD\` (including in JavaScript variables, paths, and a meta keyword)
• 22+ image URLs pointing to \`media.defense.gov\` (general portraits, OG-card images, banner photos)
• Meta keywords list: \`War Department, Department of War, DoW, DOW, Secretary, Deputy Secretary, Joint Chief, United States, Military, Government\` — both \`DoW\` and \`DOW\` are listed; they couldn’t commit to one capitalization

**On the UFO press release page (the one announcing the PURSUE program):**
• Multiple links use \`media.defense.gov/2026/...\` URLs for their imagery

**On the live PURSUE manifest:**
• PDFs at \`media.defense.gov/2023/Mar/13/.../DOD-STRATEGIC-MGMT-PLAN-2023.PDF\` — filename still has \`DOD-\` prefix`,
    sources: [
      { path: "https://www.war.gov/", note: "Homepage source — grep for `DOD` and `media.defense.gov`" },
      { path: "https://media.defense.gov", note: "Live imagery host still used by war.gov" },
    ],
  },
  {
    id: "stale-verification-tokens",
    tier: 2,
    title: "Old Google + Bing site-verification tokens still in the `<head>`",
    claim: "The war.gov homepage carries two `google-site-verification` meta tags and two `msvalidate.01` (Bing) tags. In each pair, one token is presumably stale; nobody removed the old ones during whatever migration left them behind.",
    significance: "Harmless on its own, but reveals at least one prior site ownership-handoff or platform migration. Whoever held the stale tokens once had verified ownership in Google Search Console / Bing Webmaster Tools.",
    evidence: `From the homepage \`<head>\`:

\`\`\`html
<meta name="google-site-verification" content="lcQS9MV5xMisePG-IKaE9ZNfyaMJ9qVLemvuOy3PRFQ" />
<meta name="msvalidate.01" content="235F405786FAB553A2A8EF5FD13514A7" />
<meta name="msvalidate.01" content="4BAA65E882EAE4403F4FAB3443D34664" />
<meta name="google-site-verification" content="nfNn_S6Ki0r3N9JWs7xQ6wLvXG7aNfgm5yKHnZMobhU" />
\`\`\`

Notice the interleaved order (Google, Bing, Bing, Google) — likely two different teams added their own verification tokens at different times. Bing is duplicated within consecutive lines; Google’s two are on the outside. Both Google and Bing accept either token, so the site stays verified for both teams.`,
    sources: [
      { path: "https://www.war.gov/", note: "View source — search `site-verification` and `msvalidate`" },
    ],
  },
  {
    id: "iis-404-fingerprint",
    tier: 3,
    title: "Two different 404 pages — one reveals which paths Akamai blocks at the edge",
    claim: "Most 404s on war.gov return a 98 KB DotNetNuke-styled error page with the full site chrome. But `/Admin/`, `/Install/`, `/Login.aspx`, and `/Login` return the 1245-byte raw Microsoft IIS 7 stock 404 — gray header, Verdana, “Server Error”. That tells you the path is intercepted at Akamai / the edge before the DNN app ever sees the request.",
    significance: "404 size alone is enough to fingerprint which paths are filtered at the CDN versus app layer. Belt-and-suspenders blocking on `/Admin/` etc. implies recent security hardening (and confirms war.gov runs on Microsoft IIS + DotNetNuke, despite the `Server: AkamaiGHost` masking header).",
    evidence: `Probing war.gov with curl:

\`\`\`
HTTP=404 SIZE=1245  /Admin/         ← IIS 7 stock 404 (edge-blocked)
HTTP=404 SIZE=1245  /Install/       ← IIS 7 stock 404 (edge-blocked)
HTTP=404 SIZE=1245  /Login          ← IIS 7 stock 404 (edge-blocked)
HTTP=404 SIZE=1245  /Login.aspx     ← IIS 7 stock 404 (edge-blocked)

HTTP=404 SIZE=98417 /humans.txt     ← DNN-styled 404 (app-reached)
HTTP=404 SIZE=98411 /UAP            ← DNN-styled 404 (app-reached)
HTTP=404 SIZE=98410 /api            ← DNN-styled 404 (app-reached)
\`\`\`

The stock IIS 404 contains:
\`\`\`html
<title>404 - File or directory not found.</title>
...
<div id="header"><h1>Server Error</h1></div>
<h2>404 - File or directory not found.</h2>
\`\`\`
…served with no Akamai cache headers and no DNN chrome. The DNN-styled 404 is 80× larger and includes the full site nav, footer, and meta keywords.

Combined with finding \`robots-discloses-dnn-tree\` (below), it’s now public knowledge that war.gov is IIS + DNN behind Akamai.`,
    comparisons: [
      {
        leftLabel: "Edge-blocked path (e.g. /Admin/)",
        leftValue: "IIS stock 404 · 1,245 bytes · Verdana · no chrome",
        rightLabel: "App-reached path (e.g. /UAP)",
        rightValue: "DNN-styled 404 · 98,411 bytes · full nav & footer",
      },
    ],
    sources: [
      { path: "https://www.war.gov/Admin/", note: "Returns raw IIS 7 stock 404" },
      { path: "https://www.war.gov/Login.aspx", note: "Same edge-blocked 404" },
      { path: "https://www.war.gov/Install/", note: "Same edge-blocked 404" },
    ],
  },
  {
    id: "robots-discloses-dnn-tree",
    tier: 3,
    title: "robots.txt names the entire DotNetNuke internal file tree",
    claim: "war.gov's robots.txt lists every internal DotNetNuke path — `/App_Code/`, `/App_GlobalResources/`, `/Controls/`, `/Utility/`, `/Components/`, `/Providers/`, `/Documentation/`, `/Install/`, `/Admin/`, `/bin/`, plus extensions `*.axd`, `*.exe`, `*.bin`, `*.dll`, `*.ssi`.",
    significance: "Belt-and-suspenders: those paths are *already* blocked at the Akamai edge (see finding \`iis-404-fingerprint\`), but they’re also explicitly named in robots.txt — which is itself a CMS-fingerprinting tell. Anyone curious learns war.gov runs DotNetNuke just from one HTTP request.",
    evidence: `\`\`\`
Sitemap: /DesktopModules/SiteData/SiteMap.ashx
User-agent: *
Disallow: *captcha*
Disallow: /*Print.aspx
Disallow: /*.axd$
Disallow: /*.exe$
Disallow: /bin/
Disallow: /Bin/
Disallow: /*.bin$
Disallow: /*.dll$
Disallow: /*.ssi$
Disallow: /Error/
Disallow: /Controls/
Disallow: /controls/
Disallow: /Utility/
Disallow: /install/
Disallow: /Admin/
Disallow: /App_Browser/
Disallow: /App_Code/
Disallow: /App_Data/
Disallow: /App_GlobalResources/
Disallow: /Components/
Disallow: /Config/
Disallow: /Documentation/
Disallow: /Install/
Disallow: /Providers/
\`\`\`

Note: the sitemap path \`/DesktopModules/SiteData/SiteMap.ashx\` is itself the canonical DNN sitemap-handler URL. Also: \`Disallow: *captcha*\` implies there’s a CAPTCHA somewhere they’d rather Google didn’t index.

The real sitemap (at the DNN ashx URL) contains 390 entries, with sub-sitemaps like \`DesktopModules/DVIDSVideoPlayer/SiteMap.ashx?moduleid=581\` — module IDs 581, 966, 2435, 2440, 2842 are publicly enumerated.`,
    sources: [
      { path: "https://www.war.gov/robots.txt", note: "Live robots.txt" },
      { path: "https://www.war.gov/DesktopModules/SiteData/SiteMap.ashx", note: "DNN sitemap handler (390 URLs)" },
    ],
  },
  {
    id: "operation-epic-fury",
    tier: 3,
    title: "Spotlights nav includes “Operation Epic Fury”",
    claim: "Alongside “Memorial Day” and “Freedom 250”, the war.gov homepage Spotlights nav surfaces “Operation Epic Fury” — the public codename for the Feb 28, 2026 strikes against the Iranian regime’s security apparatus.",
    significance: "Not hidden, not classified. Just a cinematically-named active military operation sitting in a CMS dropdown next to civic spotlights. Notable for the tonal contrast.",
    evidence: `From the homepage:

\`\`\`html
<a class="btn btn-primary" href="/Spotlights/Operation-Epic-Fury/" title="Operation Epic Fury">See More</a>
\`\`\`

The spotlight page itself opens with:

> *"On Feb. 28, 2026, the U.S. military commenced Operation Epic Fury under the direction and direct orders of the president of the United States. U.S. and partner forces are striking targets to dismantle the Iranian regime’s security apparatus, prioritizing locations that pose an imminent threat."*

OG title: \`Operation Epic Fury\`.

The full Spotlights list as of capture:
\`/Spotlights/COVID-19-Reinstatement/\` ·
\`/Spotlights/DOW-Support-to-the-Southern-Border/\` ·
\`/Spotlights/Drone-Dominance/\` ·
\`/Spotlights/Freedom250/\` ·
\`/Spotlights/Guidance-for-Federal-Personnel-and-Readiness-Policies/\` ·
\`/Spotlights/Memorial-Day/\` ·
\`/Spotlights/Operation-Epic-Fury/\` ·
\`/Spotlights/Value-of-Service/\``,
    sources: [
      { path: "https://www.war.gov/Spotlights/Operation-Epic-Fury/", note: "Live spotlight page" },
    ],
  },
  {
    id: "pentagon-quizzes",
    tier: 3,
    title: "The Pentagon publishes quizzes",
    claim: "war.gov hosts a `/Multimedia/Quizzes` page, linked from the homepage with a “Quizzes” CTA button. The Department of War runs trivia quizzes.",
    significance: "Pure curio. The world’s largest military bureaucracy has a quiz section in its CMS nav.",
    evidence: `From the homepage:

\`\`\`html
<a class="btn btn-primary" href="/Multimedia/Quizzes" tabindex="0"> Quizzes </a>
\`\`\`

The Quizzes route itself is currently fronted by Akamai edge filtering for non-browser User-Agents, but the link is plainly visible in the rendered footer and the route is part of the DNN module tree.`,
    sources: [
      { path: "https://www.war.gov/Multimedia/Quizzes", note: "Live Quizzes route" },
      { path: "https://www.war.gov/", note: "Homepage CTA button linking to Quizzes" },
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
