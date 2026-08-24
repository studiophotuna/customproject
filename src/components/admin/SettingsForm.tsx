"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { saveSetting, type ActionState } from "@/app/admin/(panel)/settings/actions";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "color";
  value?: string;
  placeholder?: string;
};

export function SettingsForm({
  settingKey,
  title,
  description,
  fields,
  columns = 2,
}: {
  settingKey: string;
  title: string;
  description?: string;
  fields: Field[];
  columns?: 1 | 2;
}) {
  const action = saveSetting.bind(null, settingKey);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  return (
    <form
      action={formAction}
      className="rounded-card border border-line bg-background p-5"
    >
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted">{description}</p>}
      </div>

      <div className={columns === 2 ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        {fields.map((f) => (
          <div
            key={f.name}
            className={f.type === "textarea" ? "sm:col-span-2" : undefined}
          >
            <Label htmlFor={`${settingKey}-${f.name}`}>{f.label}</Label>
            {f.type === "textarea" ? (
              <Textarea
                id={`${settingKey}-${f.name}`}
                name={f.name}
                defaultValue={f.value}
                placeholder={f.placeholder}
              />
            ) : f.type === "color" ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  name={f.name}
                  defaultValue={f.value || "#000000"}
                  className="h-9 w-12 cursor-pointer rounded border border-line bg-background"
                  aria-label={f.label}
                />
                <span className="text-xs text-muted">{f.value}</span>
              </div>
            ) : (
              <Input
                id={`${settingKey}-${f.name}`}
                name={f.name}
                defaultValue={f.value}
                placeholder={f.placeholder}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.ok && <span className="text-sm text-brand">Saved.</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
