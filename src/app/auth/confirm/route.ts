import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/forms";

// Sign-in links from the email templates land here. Unlike /auth/callback, this
// works in any browser or device, not only the one that asked for the email.
//
// Email template link:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}

function nextFrom(redirectTo: string | null, origin: string) {
  if (!redirectTo) return "/";
  try {
    const url = new URL(redirectTo, origin);
    // redirect_to is ".../auth/callback?next=/somewhere"; we want "/somewhere".
    return safeNext(url.searchParams.get("next") ?? (url.origin === origin ? url.pathname : "/"));
  } catch {
    return "/";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = nextFrom(searchParams.get("redirect_to"), origin);

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next === "/auth/callback" ? "/" : next, origin));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "link");
  if (next !== "/" && next !== "/auth/callback") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}
