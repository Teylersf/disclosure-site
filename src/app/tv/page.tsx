import TvMode from "@/components/TvMode";
import { getManifest } from "@/lib/manifest";

export const metadata = { title: "TV Mode — Disclosure" };

export default function TvPage() {
  const m = getManifest();
  const videos = m.records.filter((r) => r.type === "VID" || r.type === "AUD");
  return <TvMode videos={videos} />;
}
