import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/config";
import { dayKey } from "@/lib/time";

// Sends each person who asked for it a short email in the evening if the other
// person left something that day. Call this once an hour (see README).

type MemberRow = {
  id: string;
  space_id: string;
  user_id: string;
  display_name: string;
  timezone: string;
  daily_letter_hour: number | null;
  daily_letter_sent_on: string | null;
};

const KIND_WORDS: Record<string, string> = { note: "a note", photo: "a photo", voice: "a voice memo", day: "how their day went", lesson: "a lesson" };

function listOf(items: string[]) {
  if (items.length <= 1) return items[0] ?? "something";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Not allowed.", { status: 401 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.LETTER_FROM;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!serviceKey || !resendKey || !from || !site) {
    return Response.json({ error: "Set SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, LETTER_FROM, and NEXT_PUBLIC_SITE_URL." }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: members, error } = await admin
    .from("members")
    .select("id, space_id, user_id, display_name, timezone, daily_letter_hour, daily_letter_sent_on")
    .not("daily_letter_hour", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const sent: string[] = [];

  for (const m of members as MemberRow[]) {
    const localHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: m.timezone, hour: "numeric", hourCycle: "h23" }).format(now));
    const today = dayKey(now, m.timezone);
    if (localHour !== m.daily_letter_hour || m.daily_letter_sent_on === today) continue;

    const { data: partner } = await admin
      .from("members")
      .select("id, display_name")
      .eq("space_id", m.space_id)
      .neq("id", m.id)
      .maybeSingle();
    if (!partner) continue;

    const since = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const { data: posts } = await admin
      .from("posts")
      .select("kind")
      .eq("author_id", partner.id)
      .is("deleted_at", null)
      .gte("created_at", since);
    if (!posts?.length) continue;

    const { data: user } = await admin.auth.admin.getUserById(m.user_id);
    const email = user?.user?.email;
    if (!email) continue;

    const kinds = [...new Set(posts.map((p) => KIND_WORDS[p.kind] ?? "something"))];
    const text = `${partner.display_name} left you ${listOf(kinds)} today.\n\nWhenever you have a minute: ${site}\n\nTo stop these, turn off the daily letter in Settings.`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email, subject: `A letter from ${partner.display_name}`, text }),
    });
    if (!res.ok) continue;

    await admin.from("members").update({ daily_letter_sent_on: today }).eq("id", m.id);
    sent.push(m.id);
  }

  return Response.json({ sent: sent.length });
}
