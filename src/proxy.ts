import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseKey, supabaseUrl } from "@/lib/supabase/config";

const PUBLIC_PATHS = ["/login", "/auth", "/invite", "/setup", "/preview", "/api/cron", "/manifest.webmanifest", "/icon", "/apple-icon"];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Stray punctuation pasted onto an address ("/login," or "/invite/abc.") becomes a 404.
  // Trim it and keep everything else, including any sign-in code.
  if (pathname !== "/" && /[,.;:!)\]'"]+$/.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/[,.;:!)\]'"]+$/, "") || "/";
    return NextResponse.redirect(url);
  }

  // A sign-in code that landed somewhere other than the callback (for example the
  // Site URL, when the redirect address wasn't on Supabase's allow-list). Send it on.
  // API routes are left alone: Spotify's sign-in also comes back with a ?code=.
  if (!pathname.startsWith("/auth/") && !pathname.startsWith("/api/") && (searchParams.has("code") || searchParams.has("error_code"))) {
    const url = new URL("/auth/callback", request.url);
    searchParams.forEach((value, key) => url.searchParams.set(key, value));
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isSupabaseConfigured) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Refreshes the session cookie. Must run before any redirect decision.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  if (!signedIn && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|doodles/|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
