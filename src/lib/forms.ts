import { isInk, type Ink } from "./inks";

export type FormState = { error?: string; ok?: boolean; message?: string };

export type ProfileInput = { display_name: string; ink: Ink; city: string; timezone: string };

export function readProfile(formData: FormData): ProfileInput | { error: string } {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const ink = formData.get("ink");
  const city = String(formData.get("city") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (!display_name) return { error: "Add your name." };
  if (!isInk(ink)) return { error: "Pick an ink." };
  if (!city) return { error: "Add a city for your postmark." };
  if (!timezone) return { error: "Pick your time zone." };
  return { display_name, ink, city, timezone };
}

/** Turns a Postgres error into a sentence a person can act on. */
export function friendlyError(error: { message: string; code?: string }): string {
  if (error.code === "23505" && error.message.includes("ink")) return "Your partner already uses that ink. Pick another.";
  if (error.code === "P0001" || error.code === "22023") return error.message;
  return "Something went wrong saving that. Try again in a moment.";
}

/** Only allow redirects within this site. */
export function safeNext(value: unknown, fallback = "/"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}
