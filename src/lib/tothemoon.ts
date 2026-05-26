/**
 * Typed accessors for the NASA Apollo / Gemini / Mercury gallery manifest,
 * built from tothemoon.im-ldi.com by scripts/build-tothemoon-manifest.ts.
 */

import manifestJson from "./tothemoon-manifest.json";

export type Program = "Apollo" | "Gemini" | "Mercury";

export interface MissionImage {
  id: number | string;
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

export interface Gallery {
  program: Program;
  mission_num: number;
  magazine: string;
  sourcePath: string;
  imageCount: number;
  images: MissionImage[];
}

export interface TothemoonManifest {
  generatedAt: string;
  totalGalleries: number;
  totalImages: number;
  programs: Program[];
  byProgram: Record<Program, { missions: number[]; galleries: number; images: number }>;
  galleries: Gallery[];
}

export function getTothemoon(): TothemoonManifest {
  return manifestJson as unknown as TothemoonManifest;
}

export function getGallery(program: Program, mission: number, magazine: string): Gallery | undefined {
  return getTothemoon().galleries.find(
    (g) => g.program === program && g.mission_num === mission && g.magazine === magazine,
  );
}

export function getMissionGalleries(program: Program, mission: number): Gallery[] {
  return getTothemoon().galleries.filter((g) => g.program === program && g.mission_num === mission);
}

export function getProgramGalleries(program: Program): Gallery[] {
  return getTothemoon().galleries.filter((g) => g.program === program);
}

/**
 * Resolve a relative image path (e.g. "/data_a/AS11/png/AS11-45-6697A_THM.png")
 * to an asset URL through our standard assetUrl helper.
 */
export function imagePath(relPath: string | null | undefined): string | undefined {
  if (!relPath) return undefined;
  // The original paths are root-relative on tothemoon.im-ldi.com, so prepend the host folder.
  const clean = relPath.startsWith("/") ? relPath.slice(1) : relPath;
  return `tothemoon.im-ldi.com/${clean}`;
}

/**
 * Best human-readable label for a mission. Mercury sometimes uses 1-9 numbering;
 * Apollo / Gemini use the conventional names ("Apollo 11", "Gemini 7").
 */
export function missionLabel(program: Program, num: number): string {
  return `${program} ${num}`;
}

export function programDescription(p: Program): string {
  switch (p) {
    case "Mercury":
      return "1958–1963 · America's first crewed spaceflight program. Six crewed flights, beginning with Alan Shepard's suborbital hop and ending with Gordon Cooper's 22-orbit endurance mission.";
    case "Gemini":
      return "1961–1966 · The bridge to Apollo. Two-astronaut crews proved rendezvous, docking, EVA, and long-duration spaceflight — every prerequisite for going to the Moon.";
    case "Apollo":
      return "1961–1972 · Eleven crewed flights, six lunar landings. The Hasselblad 70mm photography brought back from each mission is the most thoroughly documented record of human exploration off-world.";
  }
}
