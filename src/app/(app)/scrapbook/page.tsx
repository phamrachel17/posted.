import Link from "next/link";
import { getScrapbook, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { Doodle } from "@/components/Doodle";
import { ScrapbookSpread } from "@/components/ScrapbookSpread";
import { ScrapbookTabs } from "@/components/ScrapbookTabs";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function monthName(key: string, withYear = true) {
  const [y, m] = key.split("-").map(Number);
  return withYear ? `${MONTHS[m - 1]} ${y}` : MONTHS[m - 1];
}

export default async function ScrapbookPage({ searchParams }: PageProps<"/scrapbook">) {
  const { m } = await searchParams;
  const us = await getUs();
  if (!us) return null;
  const book = await getScrapbook(typeof m === "string" ? m : undefined, us.me.timezone);
  const people = Object.fromEntries([us.me, us.partner].filter(Boolean).map((p) => [p!.id, { name: p!.display_name, ink: p!.ink }]));

  const index = book.month ? book.months.findIndex((x) => x.key === book.month) : -1;
  const newer = index > 0 ? book.months[index - 1] : null;
  const older = index >= 0 && index < book.months.length - 1 ? book.months[index + 1] : null;

  return (
    <main className="main wide" style={inkStyle(us.me.ink)}>
      <ScrapbookTabs current="months" />

      {book.missing ? (
        <p className="error-note">
          <b>The scrapbook isn&rsquo;t set up yet.</b>
          <span>Run the scrapbook migration in Supabase (supabase/migrations/20260926000000_scrapbook.sql), then refresh.</span>
        </p>
      ) : !book.month ? (
        <div className="empty">
          <Doodle name="stars" size={64} height={71} />
          <b>Nothing in the scrapbook yet</b>
          <p>Open the &ldquo;&hellip;&rdquo; on any post and choose &ldquo;Add to scrapbook.&rdquo; Photos, voice memos, notes, and days all fit.</p>
        </div>
      ) : (
        <>
          <nav className="month-nav" aria-label="Months">
            {older ? (
              <Link href={`/scrapbook?m=${older.key}`} className="month-step">‹ {monthName(older.key, false)}</Link>
            ) : (
              <span />
            )}
            <h2>{monthName(book.month)}</h2>
            {newer ? (
              <Link href={`/scrapbook?m=${newer.key}`} className="month-step">{monthName(newer.key, false)} ›</Link>
            ) : (
              <span />
            )}
          </nav>

          <ScrapbookSpread items={book.items} people={people} label={monthName(book.month)} />

          {book.months.length > 1 && (
            <nav className="month-list" aria-label="All months">
              {book.months.map((x) => (
                <Link key={x.key} href={`/scrapbook?m=${x.key}`} aria-current={x.key === book.month ? "page" : undefined}>
                  {monthName(x.key)}
                </Link>
              ))}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
