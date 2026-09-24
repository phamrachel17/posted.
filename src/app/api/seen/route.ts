import { createClient } from "@/lib/supabase/server";

// Called with navigator.sendBeacon when you leave the page, so the
// "last here" line only moves after you've actually looked.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return new Response(null, { status: 401 });

  await supabase.from("members").update({ last_seen_at: new Date().toISOString() }).eq("user_id", userId);
  return new Response(null, { status: 204 });
}
