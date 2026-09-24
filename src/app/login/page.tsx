import { LoginForm } from "@/components/LoginForm";
import { Doodle } from "@/components/Doodle";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">A private place for two. Sign in with your email and we&rsquo;ll send you a link.</p>
        {error && (
          <p className="error-note">
            <b>That sign-in link didn&rsquo;t work.</b>
            <span>
              {error === "different-browser"
                ? "It opened in a different browser from the one that asked for it. Request a new link below, then open the email on this same device and browser."
                : error === "expired"
                  ? "It was already used or has expired. Request a new one below."
                  : "Links expire after an hour and can only be used once. Request a new one below."}
            </span>
          </p>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
