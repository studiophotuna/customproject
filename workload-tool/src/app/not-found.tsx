import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl rounded border border-[var(--color-line)] bg-white p-6">
      <h1 className="text-base font-semibold">Not found</h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
        That ticket does not exist, or it has been removed.
      </p>
      <Link
        href="/queue"
        className="mt-4 inline-block rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        Back to the queue
      </Link>
    </div>
  );
}
