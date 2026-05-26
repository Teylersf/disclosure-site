/**
 * Build a typed manifest of every NASA Apollo / Gemini / Mercury gallery
 * mirrored from tothemoon.im-ldi.com.
 *
 * Reads each gallery's index.html, extracts the embedded data-gallery JSON
 * (an array of image metadata: image_id, mission_num, magazine, camera,
 * film_type, thumb/small/med/full/raw image paths, etc), and writes a single
 * src/lib/tothemoon-manifest.json the site can consume.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const MIRROR_ROOT = path.resolve(__dirname, "..", "..", "tothemoon.im-ldi.com");
const OUT_FILE = path.resolve(__dirname, "..", "src", "lib", "tothemoon-manifest.json");

type Program = "Apollo" | "Gemini" | "Mercury";

interface MissionImage {
  id: string;
  image_id: string;
  program: string;
  mission_num: number | null;
  magazine: string | null;
  subject?: string | null;
  camera_name?: string | null;
  lens?: string | null;
  film_type?: string | null;
  date?: string | null;
  longitude?: string | null;
  latitude?: string | null;
  thumb_image: string | null;
  small_image: string | null;
  med_image: string | null;
  full_image: string | null;
  raw_image: string | null;
}

interface Gallery {
  program: Program;
  mission_num: number;
  /** URL slug ("3", "6", "11", "1"…). */
  magazine: string;
  /** Original mirror path (so we can deep-link). */
  sourcePath: string;
  imageCount: number;
  images: MissionImage[];
}

interface Manifest {
  generatedAt: string;
  totalGalleries: number;
  totalImages: number;
  programs: Program[];
  byProgram: Record<Program, { missions: number[]; galleries: number; images: number }>;
  galleries: Gallery[];
}

function decodeAttr(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function extractFromHtml(file: string): Promise<MissionImage[] | null> {
  const html = await fs.readFile(file, "utf8");
  // data-gallery comes as the value of an attribute, single- or double-quoted.
  // Use a non-greedy match that handles both quote styles.
  const m = html.match(/data-gallery=(['"])([\s\S]*?)\1/);
  if (!m) return null;
  const decoded = decodeAttr(m[2]);
  try {
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) return null;
    return parsed as MissionImage[];
  } catch {
    return null;
  }
}

/** Convert gallery filesystem path into program / mission / magazine. */
function parseGalleryPath(file: string): { program: Program; mission_num: number; magazine: string } | null {
  // …/tothemoon.im-ldi.com/gallery/<program>/<mission>/<magazine>/index.html
  const rel = path.relative(MIRROR_ROOT, file).split(path.sep);
  if (rel[0] !== "gallery" || rel.length < 5) return null;
  const programRaw = rel[1].toLowerCase();
  const programMap: Record<string, Program> = { apollo: "Apollo", gemini: "Gemini", mercury: "Mercury" };
  const program = programMap[programRaw];
  if (!program) return null;
  const mission_num = parseInt(rel[2], 10);
  if (!Number.isFinite(mission_num)) return null;
  const magazine = rel[3];
  return { program, mission_num, magazine };
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name === "index.html") yield full;
  }
}

async function main() {
  const galleryRoot = path.join(MIRROR_ROOT, "gallery");
  try {
    await fs.access(galleryRoot);
  } catch {
    console.error(`No mirror found at ${MIRROR_ROOT}. Skipping (build will use any existing manifest).`);
    try {
      await fs.access(OUT_FILE);
      console.log(`Existing manifest kept at ${OUT_FILE}`);
      return;
    } catch {
      // Write an empty manifest so imports don't fail
      await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
      const empty: Manifest = {
        generatedAt: new Date().toISOString(),
        totalGalleries: 0,
        totalImages: 0,
        programs: [],
        byProgram: { Apollo: { missions: [], galleries: 0, images: 0 }, Gemini: { missions: [], galleries: 0, images: 0 }, Mercury: { missions: [], galleries: 0, images: 0 } },
        galleries: [],
      };
      await fs.writeFile(OUT_FILE, JSON.stringify(empty, null, 2));
      console.log("Wrote empty manifest (no mirror present)");
      return;
    }
  }

  const galleries: Gallery[] = [];
  for await (const file of walk(galleryRoot)) {
    const meta = parseGalleryPath(file);
    if (!meta) continue;
    const images = await extractFromHtml(file);
    if (!images || images.length === 0) continue;
    galleries.push({
      ...meta,
      sourcePath: path.relative(path.resolve(MIRROR_ROOT, ".."), file).split(path.sep).join("/"),
      imageCount: images.length,
      images,
    });
  }

  galleries.sort((a, b) => {
    const order = { Apollo: 0, Gemini: 1, Mercury: 2 } as const;
    if (order[a.program] !== order[b.program]) return order[a.program] - order[b.program];
    if (a.mission_num !== b.mission_num) return a.mission_num - b.mission_num;
    return a.magazine.localeCompare(b.magazine, undefined, { numeric: true });
  });

  const byProgram: Record<Program, { missions: number[]; galleries: number; images: number }> = {
    Apollo: { missions: [], galleries: 0, images: 0 },
    Gemini: { missions: [], galleries: 0, images: 0 },
    Mercury: { missions: [], galleries: 0, images: 0 },
  };
  for (const g of galleries) {
    byProgram[g.program].galleries++;
    byProgram[g.program].images += g.imageCount;
    if (!byProgram[g.program].missions.includes(g.mission_num)) byProgram[g.program].missions.push(g.mission_num);
  }
  for (const p of Object.keys(byProgram) as Program[]) byProgram[p].missions.sort((a, b) => a - b);

  const manifest: Manifest = {
    generatedAt: new Date().toISOString(),
    totalGalleries: galleries.length,
    totalImages: galleries.reduce((s, g) => s + g.imageCount, 0),
    programs: (Object.keys(byProgram) as Program[]).filter((p) => byProgram[p].galleries > 0),
    byProgram,
    galleries,
  };

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(manifest, null, 2));
  console.log(`Wrote ${OUT_FILE}`);
  console.log(`Galleries: ${manifest.totalGalleries}, total images: ${manifest.totalImages}`);
  for (const p of manifest.programs) {
    const bp = manifest.byProgram[p];
    console.log(`  ${p}: ${bp.galleries} galleries · ${bp.images} images · missions ${bp.missions.join(", ")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
