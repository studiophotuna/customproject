"use server";

import { createClient } from "@/lib/supabase/server";

export type FormState = { ok: boolean; message: string } | null;

function str(data: FormData, key: string): string {
  return (data.get(key) ?? "").toString().trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Newsletter signup (footer). Public insert allowed by RLS. */
export async function subscribeNewsletter(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .insert({ email });

  // Treat a duplicate email as success (already subscribed).
  if (error && error.code !== "23505") {
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  return { ok: true, message: "Thanks for subscribing!" };
}

/** Custom cake enquiry form. */
export async function submitCustomCake(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const name = str(data, "name");
  const email = str(data, "email").toLowerCase();
  const details = str(data, "details");

  if (!name || !EMAIL_RE.test(email) || !details) {
    return { ok: false, message: "Please fill in your name, a valid email, and details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("custom_cake_requests").insert({
    name,
    email,
    phone: str(data, "phone") || null,
    event_date: str(data, "event_date") || null,
    occasion: str(data, "occasion") || null,
    servings: str(data, "servings") || null,
    budget: str(data, "budget") || null,
    details,
  });

  if (error) {
    return { ok: false, message: "Could not send your request. Please try again." };
  }
  return { ok: true, message: "Thank you! We'll be in touch about your custom cake soon." };
}

/** Contact form. */
export async function submitContact(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const name = str(data, "name");
  const email = str(data, "email").toLowerCase();
  const message = str(data, "message");

  if (!name || !EMAIL_RE.test(email) || !message) {
    return { ok: false, message: "Please fill in your name, a valid email, and a message." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert({
    name,
    email,
    phone: str(data, "phone") || null,
    subject: str(data, "subject") || null,
    message,
  });

  if (error) {
    return { ok: false, message: "Could not send your message. Please try again." };
  }
  return { ok: true, message: "Thanks for reaching out! We'll reply as soon as we can." };
}
