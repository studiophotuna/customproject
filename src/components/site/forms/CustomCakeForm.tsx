"use client";

import { useActionState } from "react";
import { submitCustomCake, type FormState } from "@/app/actions/forms";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";

export function CustomCakeForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitCustomCake,
    null,
  );

  if (state?.ok) {
    return (
      <div className="rounded-card border border-brand bg-brand-light p-6 text-center">
        <p className="font-medium text-brand">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>
      <div>
        <Label htmlFor="event_date">Event date</Label>
        <Input id="event_date" name="event_date" type="date" />
      </div>
      <div>
        <Label htmlFor="occasion">Occasion</Label>
        <Input id="occasion" name="occasion" placeholder="Birthday, wedding…" />
      </div>
      <div>
        <Label htmlFor="servings">Servings</Label>
        <Select id="servings" name="servings" defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          <option>Up to 10</option>
          <option>10–20</option>
          <option>20–50</option>
          <option>50+</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="budget">Budget (AED)</Label>
        <Input id="budget" name="budget" placeholder="e.g. 200–400" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="details">Tell us about your cake *</Label>
        <Textarea
          id="details"
          name="details"
          required
          placeholder="Flavors, colors, theme, inspiration…"
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-red-600 sm:col-span-2">{state.message}</p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Send Request"}
        </Button>
      </div>
    </form>
  );
}
