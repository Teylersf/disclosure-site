/**
 * Inline JSON-LD structured-data block.
 * Server-only component — safe to drop into any page.
 */
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
