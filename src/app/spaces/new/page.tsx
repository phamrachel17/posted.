import Link from "next/link";
import { redirect } from "next/navigation";
import { getUs, getUserId } from "@/lib/data";
import { WelcomeForm } from "@/components/WelcomeForm";
import { Doodle } from "@/components/Doodle";

/** Start another space with someone else. Your current one stays as it is. */
export default async function NewSpacePage() {
  if (!(await getUserId())) redirect("/login");
  const us = await getUs();
  if (!us) redirect("/welcome");

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">A new space, just for you and one other person.</p>
        <p className="hint">
          Your space with {us.partner?.display_name ?? "your first person"} stays exactly as it is. You can use a
          different name, ink, and city here. Next you&rsquo;ll get an invite link to send.
        </p>
        <WelcomeForm submitLabel="Start this space" />
        <p className="hint">
          <Link href="/">Never mind, go back</Link>
        </p>
      </div>
    </main>
  );
}
