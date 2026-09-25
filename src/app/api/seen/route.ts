import { createClient } from "@/lib/supabase/server";

// Called with navigator.sendBeacon when you leave the page, so the
// "last here" line only moves after you've actually looked.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return new Response(null, { status: 401 });

  // Only the space you're looking at; your other spaces keep their own "last here".
  const { data: memberId } = await supabase.rpc("my_member_id");
  if (!memberId) return new Response(null, { status: 204 });
  await supabase.from("members").update({ last_seen_at: new Date().toISOString() }).eq("id", memberId as string);
  return new Response(null, { status: 204 });
}
