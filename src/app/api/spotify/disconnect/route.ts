import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return new NextResponse(null, { status: 401 });
  await supabase.from("spotify_accounts").delete().eq("user_id", userId);
  return new NextResponse(null, { status: 204 });
}
