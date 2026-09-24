import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Doodle } from "@/components/Doodle";

export default function SetupPage() {
  if (isSupabaseConfigured) redirect("/");

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">posted. isn&rsquo;t connected to a database yet.</p>
        <p>
          Create a Supabase project, run the migration in <code>supabase/migrations</code>, then copy{" "}
          <code>.env.example</code> to <code>.env.local</code> and fill in the project URL and publishable key.
          The README has the full steps.
        </p>
        <p className="hint">
          Want to see the design first? <a href="/preview">Open the preview</a>, which uses sample posts.
        </p>
      </div>
    </main>
  );
}
