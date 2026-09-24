import { redirect } from "next/navigation";
import { getUs, getUserId } from "@/lib/data";
import { WelcomeForm } from "@/components/WelcomeForm";
import { Doodle } from "@/components/Doodle";

export default async function WelcomePage() {
  if (!(await getUserId())) redirect("/login");
  if (await getUs()) redirect("/");

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">
          A little about you first. Next you&rsquo;ll get a link to send to the other person.
        </p>
        <p className="hint">
          If they already sent you an invite link, open that instead.
        </p>
        <WelcomeForm />
      </div>
    </main>
  );
}
