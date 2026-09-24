import Link from "next/link";

const TABS = {
  months: {
    href: "/scrapbook",
    label: "Months",
    blurb: "Laid out for you. Add any post from its “…” menu and it appears on the month it was posted.",
  },
  pages: {
    href: "/scrapbook/pages",
    label: "Our pages",
    blurb: "Made by hand. Start a page and arrange photos, short videos, GIFs, stickers, and notes however you like.",
  },
};

/** The two halves of the scrapbook, and a line saying how each one works. */
export function ScrapbookTabs({ current }: { current: keyof typeof TABS }) {
  return (
    <header className="page-head scrap-head">
      <h1 className="page-title">Our scrapbook</h1>
      <nav className="scrap-tabs" aria-label="Scrapbook">
        {Object.entries(TABS).map(([key, t]) => (
          <Link key={key} href={t.href} aria-current={key === current ? "page" : undefined}>
            <span className="scrap-tab-label">{t.label}</span>
            <span className="scrap-tab-kind">{key === "months" ? "Filled in automatically" : "Made by you"}</span>
          </Link>
        ))}
      </nav>
      <p className="hint">{TABS[current].blurb}</p>
    </header>
  );
}
