"use client";

import { useSyncExternalStore } from "react";

import { formatDuration } from "@/lib/domain/work";

// The wall clock is an external store, not React state, so it is subscribed to
// rather than copied into state from an effect. Snapshots are whole seconds so
// repeated reads inside one second are identical, which is what lets React
// compare them without re-rendering in a loop.

function subscribe(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

// On the server there is no ticking clock; null renders a zeroed timer, and the
// first client snapshot replaces it. Both sides agree on the initial markup.
const serverSnapshot = () => null;

/**
 * Counts up from a fixed start instant.
 *
 * The server sends the start time rather than an elapsed figure, so the display
 * stays correct across re-renders and tab sleeps, and never drifts from what
 * the database computes when the activity is finally closed.
 */
export function LiveTimer({
  startedAt,
  className,
}: {
  startedAt: string;
  className?: string;
}) {
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  const start = new Date(startedAt).getTime() / 1000;
  const elapsed = now === null ? 0 : Math.max(0, now - start);

  return <span className={className}>{formatDuration(elapsed)}</span>;
}
