import Link from "next/link";
import { createScrapPage } from "@/app/actions/scrapbook";
import { getScrapPages, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { localStamp, spokenTime } from "@/lib/time";
import { Doodle } from "@/components/Doodle";
import { PageView } from "@/components/PieceContent";
import { ScrapbookTabs } from "@/components/ScrapbookTabs";

export default async function ScrapPagesPage() {
  const [us, { missing, pages }] = await Promise.all([getUs(), getScrapPages()]);
  if (!us) return null;
  const now = new Date();

  return (
    <main className="main wide" style={inkStyle(us.me.ink)}>
      <ScrapbookTabs current="pages" />

      {missing ? (
        <p className="error-note">
          <b>Hand-made pages aren&rsquo;t set up yet.</b>
          <span>Run supabase/migrations/20260927000000_scrapbook_pages.sql in Supabase, then refresh.</span>
        </p>
      ) : (
        <div className="page-grid">
          <form action={createScrapPage}>
            <button type="submit" className="page-card page-new">
              <Doodle name="plus" size={26} />
              <b>Start a page</b>
            </button>
          </form>
          {pages.map((p) => (
            <Link key={p.id} href={`/scrapbook/pages/${p.id}`} className="page-card">
              <PageView pieces={p.pieces} />
              <b>{p.title}</b>
              <span className="hint">
                Changed {spokenTime(p.updated_at, localStamp(new Date(p.updated_at), us.me.timezone), us.me.timezone, now)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
