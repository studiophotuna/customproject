"use client";

import { useActionState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { saveLogo, removeLogo, type ActionState } from "@/app/admin/(panel)/settings/actions";

export function LogoUpload({ current }: { current: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveLogo, null);
  const [removing, startRemove] = useTransition();

  return (
    <div className="rounded-card border border-line bg-background p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Logo</h2>
        <p className="text-sm text-muted">
          Upload a logo image to replace the text wordmark in the header and footer.
          A transparent PNG or SVG works best. Leave empty to use the text logo.
        </p>
      </div>

      {current && (
        <div className="mb-4">
          <div className="inline-flex items-center rounded-md border border-line bg-surface p-3">
            <Image
              src={current}
              alt="Current logo"
              width={220}
              height={64}
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>
      )}

      <form action={action} className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="logo">{current ? "Replace logo" : "Upload logo"}</Label>
          <Input id="logo" name="logo" type="file" accept="image/*" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Save logo"}
        </Button>
        {current && (
          <button
            type="button"
            disabled={removing}
            onClick={() => startRemove(() => removeLogo())}
            className="rounded-card border border-line px-4 py-2 text-sm text-red-600 hover:bg-surface disabled:opacity-60"
          >
            {removing ? "Removing…" : "Remove logo"}
          </button>
        )}
      </form>

      {state?.ok && <p className="mt-3 text-sm text-brand">Logo updated.</p>}
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
