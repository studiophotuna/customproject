"use client";

import { useTransition } from "react";
import { setMessageRead } from "@/app/admin/(panel)/messages/actions";

export function ReadToggle({ id, isRead }: { id: string; isRead: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => setMessageRead(id, !isRead))}
      className="rounded-md border border-line px-2 py-1 text-xs hover:bg-surface disabled:opacity-60"
    >
      {isRead ? "Mark unread" : "Mark read"}
    </button>
  );
}
