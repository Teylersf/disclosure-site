import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <div className="text-xs tracking-[0.4em] text-[var(--muted)] uppercase mb-4">404</div>
      <h1 className="text-3xl font-bold gradient-text">Record not found</h1>
      <p className="text-[var(--muted)] mt-4">
        This record ID isn&apos;t in the current manifest. It may have been renamed in a future release.
      </p>
      <Link href="/" className="btn btn-primary mt-6 inline-flex">← Back to archive</Link>
    </div>
  );
}
