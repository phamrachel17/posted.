import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/forms";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // "different-browser": the code arrived but this browser didn't ask for it.
  // "expired": Supabase already rejected the link (used, expired, or prefetched).
  const reason = code ? "different-browser" : searchParams.get("error_code") === "otp_expired" ? "expired" : "link";
  const login = new URL("/login", origin);
  login.searchParams.set("error", reason);
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
