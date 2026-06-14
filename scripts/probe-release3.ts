/**
 * Probe predictable URL patterns for a war.gov release 3. Returns HTTP
 * status + size for each candidate.
 */
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Referer": "https://www.war.gov/UFO/",
};

const candidates = [
  // Predictable release-3 CSV / data files
  "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-release003.csv",
  "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-release03.csv",
  "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-release_03.csv",
  "https://www.war.gov/Portals/1/Interactive/2026/UFO/uap-release3.csv",
  "https://www.war.gov/Portals/1/Interactive/2026/UFO/release_03.csv",
  // Sandbox / staging
  "https://www.war.gov/Portals/1/SANDBOXES/BEvans/testing-doc.csv",
  // Release 3 medialink folders (date-coded, NL release pattern used 052226/052826)
  "https://www.war.gov/medialink/ufo/060226/",
  "https://www.war.gov/medialink/ufo/060126/",
  "https://www.war.gov/medialink/ufo/060326/",
  "https://www.war.gov/medialink/ufo/053026/",
  // Release-3 bundle ZIP (matches pattern of release_02_document_bundle.zip)
  "https://www.war.gov/medialink/ufo/060226/release_03/release_03_document_bundle.zip",
  "https://www.war.gov/medialink/ufo/release_03/release_03_document_bundle.zip",
  "https://www.war.gov/medialink/ufo/bundle/Release_3.zip",
  "https://www.war.gov/medialink/ufo/bundle/Release_03.zip",
  // News article (releases get pressers in /News/)
  "https://www.war.gov/News/Releases/Tag/uap/",
  // PURSUE base URL
  "https://www.war.gov/UFO/",
];

async function probe(url: string): Promise<{ url: string; status: number; size: number; contentType?: string }> {
  try {
    const r = await fetch(url, { headers: HEADERS, redirect: "manual" });
    const ct = r.headers.get("content-type") ?? undefined;
    const cl = r.headers.get("content-length");
    let size = cl ? parseInt(cl) : 0;
    if (!cl && r.ok) {
      try { const body = await r.arrayBuffer(); size = body.byteLength; } catch {}
    }
    return { url, status: r.status, size, contentType: ct };
  } catch (e) {
    return { url, status: 0, size: 0, contentType: String(e) };
  }
}

async function main() {
  for (const u of candidates) {
    const r = await probe(u);
    const marker = r.status === 200 ? "✓✓✓" : r.status === 0 ? "ERR" : r.status === 404 ? "   " : `${r.status} `;
    console.log(`${marker} HTTP ${String(r.status).padStart(3)} · ${String(r.size).padStart(8)} B · ${(r.contentType ?? "").slice(0, 30).padEnd(30)} · ${u}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
