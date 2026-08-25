"use client";

import { useActionState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { InstagramIcon } from "@/components/ui/SocialIcons";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import {
  saveAndSyncInstagram,
  syncInstagramNow,
  disconnectInstagram,
  type ActionState,
} from "@/app/admin/(panel)/settings/actions";
import { formatDate } from "@/lib/utils";

type Status = {
  connected: boolean;
  userLabel?: string;
  lastSyncedAt?: string;
  count: number;
};

export function InstagramConnect({ status }: { status: Status }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveAndSyncInstagram,
    null,
  );
  const [busy, start] = useTransition();

  return (
    <div className="rounded-card border border-line bg-background p-5">
      <div className="mb-4 flex items-center gap-2">
        <InstagramIcon className="h-5 w-5 text-brand" />
        <h2 className="font-semibold text-foreground">Instagram Feed</h2>
      </div>

      <p className="mb-4 text-sm text-muted">
        Auto-pull recent posts from your Instagram <strong>Business/Creator</strong>{" "}
        account. Paste a long-lived access token from your Meta app, then Save &amp;
        Sync. The homepage feed updates from your latest posts.
      </p>

      {status.connected && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-brand-light px-4 py-3 text-sm">
          <span className="font-medium text-brand">● Connected</span>
          {status.userLabel && <span className="text-muted">{status.userLabel}</span>}
          <span className="text-muted">{status.count} posts cached</span>
          {status.lastSyncedAt && (
            <span className="text-muted">Last sync: {formatDate(status.lastSyncedAt)}</span>
          )}
        </div>
      )}

      <form action={action} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="userLabel">Account label (optional)</Label>
            <Input id="userLabel" name="userLabel" defaultValue={status.userLabel} placeholder="@yourbakery" />
          </div>
          <div>
            <Label htmlFor="token">
              Access token {status.connected && "(leave blank to keep current)"}
            </Label>
            <Input id="token" name="token" type="password" placeholder="IGQVxxxx…" autoComplete="off" />
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-brand">{state.message}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Syncing…" : "Save & Sync"}
          </Button>

          {status.connected && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(() => syncInstagramNow())}
                className="inline-flex items-center gap-2 rounded-card border border-line px-4 py-2 text-sm hover:bg-surface disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                Sync now
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => start(() => disconnectInstagram())}
                className="rounded-card border border-line px-4 py-2 text-sm text-red-600 hover:bg-surface disabled:opacity-60"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </form>

      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer text-brand">How do I get an access token?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Convert the Instagram account to a Business or Creator account.</li>
          <li>Create an app at developers.facebook.com and add the Instagram product.</li>
          <li>Generate a long-lived user access token with the instagram_graph_user_profile
              and instagram_graph_user_media permissions.</li>
          <li>Paste the token above. It auto-refreshes on each sync (valid ~60 days).</li>
        </ol>
      </details>
    </div>
  );
}
