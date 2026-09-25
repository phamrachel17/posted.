"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAvatarIcon, isAvatarPath } from "@/lib/avatars";
import { getUs } from "@/lib/data";
import { friendlyError, readProfile, type FormState } from "@/lib/forms";

export async function createSpace(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = readProfile(formData);
  if ("error" in profile) return profile;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_space", {
    p_display_name: profile.display_name,
    p_ink: profile.ink,
    p_city: profile.city,
    p_timezone: profile.timezone,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect("/settings#invite");
}

export async function acceptInvite(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const profile = readProfile(formData);
  if ("error" in profile) return profile;

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", {
    p_token: token,
    p_display_name: profile.display_name,
    p_ink: profile.ink,
    p_city: profile.city,
    p_timezone: profile.timezone,
  });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to change your settings." };
  const profile = readProfile(formData);
  if ("error" in profile) return profile;

  const supabase = await createClient();
  const { error } = await supabase.from("members").update(profile).eq("id", us.me.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}

export async function updateVisit(_prev: FormState, formData: FormData): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to change your settings." };

  const date = String(formData.get("next_visit_on") ?? "").trim();
  const place = String(formData.get("next_visit_place") ?? "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date from the calendar." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("spaces")
    .update({ next_visit_on: date || null, next_visit_place: place || null })
    .eq("id", us.space.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: date ? "Saved." : "Cleared." };
}

export async function createInvite(): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to make an invite." };
  if (us.partner) return { error: `${us.partner.display_name} has already joined.` };

  const supabase = await createClient();
  await supabase.from("invites").delete().eq("space_id", us.space.id).is("used_at", null);
  const { data, error } = await supabase
    .from("invites")
    .insert({ space_id: us.space.id, created_by: us.me.id })
    .select("token")
    .single();
  if (error) return { error: friendlyError(error) };
  return { ok: true, message: data.token };
}

export async function updateLetter(_prev: FormState, formData: FormData): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to change your settings." };
  const raw = String(formData.get("daily_letter_hour") ?? "");
  const hour = raw === "" ? null : Number(raw);
  if (hour !== null && !(Number.isInteger(hour) && hour >= 0 && hour <= 23)) return { error: "Pick a time from the list." };

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ daily_letter_hour: hour }).eq("id", us.me.id);
  if (error) return { error: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true, message: hour === null ? "The daily letter is off." : "Saved." };
}

/**
 * Sets your profile picture or icon. A new picture replaces the icon and the old
 * picture; picking an icon (or neither, for your initial) removes the picture.
 */
export async function setAvatar(choice: { path: string } | { icon: string } | null): Promise<{ error?: string }> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to change your picture." };

  let update: { avatar_path: string | null; avatar_icon: string | null };
  if (choice && "path" in choice) {
    if (!isAvatarPath(choice.path, us.space.id)) return { error: "That picture didn't upload properly. Try again." };
    update = { avatar_path: choice.path, avatar_icon: null };
  } else if (choice && "icon" in choice) {
    if (!isAvatarIcon(choice.icon)) return { error: "Pick one of the drawings." };
    update = { avatar_path: null, avatar_icon: choice.icon };
  } else {
    update = { avatar_path: null, avatar_icon: null };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("members").update(update).eq("id", us.me.id);
  if (error) return { error: "Your picture didn't save. Try again." };

  const old = us.me.avatar_path;
  if (old && old !== update.avatar_path) await supabase.storage.from("media").remove([old]);
  revalidatePath("/", "layout");
  return {};
}

/** Opens another of your spaces. */
export async function switchSpace(formData: FormData) {
  const spaceId = String(formData.get("space_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_space", { p_space_id: spaceId });
  if (error) return;
  revalidatePath("/", "layout");
  redirect("/");
}
