"use client";

import { useActionState } from "react";
import { submitContact, type FormState } from "@/app/actions/forms";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    submitContact,
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
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" />
        </div>
      </div>
      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea id="message" name="message" required />
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send Message"}
        </Button>
      </div>
    </form>
  );
}
