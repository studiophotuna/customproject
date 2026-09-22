"use client";

// Route-level error boundary.
// -----------------------------------------------------------------------------
// Authorization failures are a normal outcome here (a MEMBER opening /leader),
// not a crash, so they get a plain explanation instead of a stack trace. React
// scrubs error messages in production builds, so the digest is surfaced to
// correlate with the server log.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const denied =
    error.message.includes("Requires") ||
    error.message.includes("Not authenticated");

  return (
    <div className="mx-auto max-w-xl rounded border border-[var(--color-line)] bg-white p-6">
      <h1 className="text-base font-semibold">
        {denied ? "You do not have access to this page" : "Something went wrong"}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
        {denied
          ? error.message
          : "The page could not be loaded. If this persists, check the server log."}
      </p>
      {error.digest && (
        <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
          Reference: {error.digest}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-4 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
      >
        Try again
      </button>
    </div>
  );
}
