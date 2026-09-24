"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext, type FormState } from "@/lib/forms";

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function allowed(email: string) {
  const list = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !list?.length || list.includes(email);
}

export async function sendMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(formData.get("next"));

  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That doesn't look like an email address." };
  // Same message either way, so the form doesn't reveal who is allowed in.
  if (!allowed(email)) return { ok: true, message: email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      return { error: "posted. has sent its limit of sign-in emails for now. Try again in an hour. If you already have a recent sign-in email, use the link in that one." };
    }
    if (error.status === 429) return { error: "That was a lot of sign-in emails in a row. Wait a minute, then try again." };
    return { error: "The sign-in email couldn't be sent. Try again in a moment." };
  }
  return { ok: true, message: email };
}

const MIN_PASSWORD = 8;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    next: safeNext(formData.get("next")),
  };
}

export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "This account hasn't been confirmed yet. Use the “Email me a link” option once to confirm it." };
    }
    if (error.status === 429) return { error: "Too many attempts. Wait a minute, then try again." };
    return { error: "That email and password don't match. If you've only ever used email links, you don't have a password yet." };
  }
  redirect(next);
}

export async function signUpWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { email, password, next } = readCredentials(formData);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "That doesn't look like an email address." };
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.` };
  if (!allowed(email)) return { error: "This email can't make an account here. Check with the person who invited you." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "There's already an account with that email. Sign in instead." };
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (error.code === "over_email_send_rate_limit") {
      return { error: "posted. has sent its limit of emails for now. Try again in an hour." };
    }
    return { error: "The account couldn't be created. Try again in a moment." };
  }
  if (data.session) redirect(next);
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "There's already an account with that email. Sign in instead." };
  }
  return { ok: true, message: `Almost there. Confirm your email from the message sent to ${email}, then sign in with your password.` };
}

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters.` };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "weak_password") return { error: "That password is too easy to guess. Try a longer one." };
    if (error.code === "same_password") return { error: "That's already your password." };
    return { error: "Your password didn't save. Try again." };
  }
  return { ok: true, message: "Password saved. You can sign in with it from now on." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
