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
        {error === "link" && (
          <p className="error-note">
            <b>That sign-in link didn&rsquo;t work.</b>
            <span>Links expire after an hour and only work in the browser that asked for them. Request a new one below.</span>
          </p>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </div>
    </main>
  );
}
