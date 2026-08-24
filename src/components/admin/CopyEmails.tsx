"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyEmails({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  if (emails.length === 0) return null;

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(emails.join(", "));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-2 rounded-card border border-line px-4 py-2 text-sm hover:bg-surface"
    >
      <Copy className="h-4 w-4" />
      {copied ? "Copied!" : "Copy all emails"}
    </button>
  );
}
