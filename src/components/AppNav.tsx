"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, type CSSProperties } from "react";
import { Doodle } from "./Doodle";
import { NotebookDialog } from "./NotebookDialog";
import { NotebookMark } from "./NotebookMark";
import { OnlineDot } from "./Presence";
import { SpaceList, type SpaceChoice } from "./SpaceSwitcher";
import { RECORD_EVENT } from "@/lib/events";
import { useDragSort } from "@/lib/drag-sort";
import { reorderNotebooks } from "@/app/actions/notebooks";

const LINKS: { href: string; label: string; doodle: string; sidebarOnly?: boolean }[] = [
  { href: "/", label: "Today", doodle: "nav-today" },
  { href: "/notebooks", label: "Notebooks", doodle: "nav-notebooks" },
  { href: "/scrapbook", label: "Scrapbook", doodle: "nav-scrapbook" },
  { href: "/bucket-list", label: "Bucket list", doodle: "nav-bucket", sidebarOnly: true },
  { href: "/kept", label: "Kept", doodle: "nav-kept" },
  { href: "/settings", label: "Settings", doodle: "nav-you-two" },
];

type Person = { id?: string; name: string; style: CSSProperties };

export type NavNotebook = { id: string; slug: string; name: string; doodle: string | null; isNew: boolean };

type Props = {
  me: Person;
  notebooks?: NavNotebook[];
  partner: Person | null;
  /** Forces the active item, for the design preview. */
  active?: string;
  /** Every space you're in, for the switcher at the bottom. */
  spaces?: SpaceChoice[];
};

export function AppNav({ me, partner, active, notebooks = [], spaces = [] }: Props) {
  const pathname = usePathname();
  // Drag notebooks to reorder them. The preview doesn't save.
  const saveOrder = useCallback(
    (ids: string[]) => {
      if (!active) void reorderNotebooks(ids);
    },
    [active],
  );
  const { order, itemProps } = useDragSort(notebooks.map((n) => n.id), saveOrder);
  const sortedNotebooks = order.map((id) => notebooks.find((n) => n.id === id)!).filter(Boolean);
  const router = useRouter();

  // Pages with a composer start recording in place; elsewhere, go to Today and record there.
  function record() {
    if (pathname === "/" || pathname.startsWith("/n/")) window.dispatchEvent(new Event(RECORD_EVENT));
    else router.push("/?record=1");
  }
  const current = (href: string) => {
    if (active) return active === href ? "page" : undefined;
    return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`)) ? "page" : undefined;
  };

  return (
    <>
      <nav className="nav" aria-label="Main">
        <Link href="/" className="brand" aria-label="posted. Today">
          <Doodle name="logo-small" size={88} height={67} />
          <span className="wordmark">posted<span>.</span></span>
        </Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="nav-link" aria-current={current(l.href)}>
            <Doodle name={l.doodle} size={22} />
            {l.label}
          </Link>
        ))}
        {notebooks && (
          <div className="nav-notebooks">
            <div className="nav-notebooks-head">
              <span className="label">Notebooks</span>
              <NotebookDialog triggerClassName="nav-add" triggerLabel="Start a notebook" trigger={<Doodle name="plus" size={14} />} />
            </div>
            <ul className="sortable">
              {sortedNotebooks.map((n) => {
                const href = `/n/${n.slug}`;
                const here = !active && (pathname === href || pathname.startsWith(`${href}/`));
                return (
                  <li key={n.id} {...itemProps(n.id)}>
                    <Link
                      href={href}
                      className={n.isNew && !here ? "nav-nb is-new" : "nav-nb"}
                      aria-current={here ? "page" : undefined}
                    >
                      <NotebookMark doodle={n.doodle} size={26} />
                      <span className="nav-nb-name">{n.name}</span>
                      {n.isNew && !here && (
                        <>
                          <span className="nb-dot" aria-hidden />
                          <span className="visually-hidden"> (updated)</span>
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <details className="nav-foot space-switch">
          <summary aria-label="Switch spaces">
            <span className="ink-dot" style={me.style} /> {me.name}
            {partner && (
              <>
                <span>&amp;</span>
                <span className="ink-dot" style={partner.style} /> {partner.name}
                {partner.id && <OnlineDot memberId={partner.id} label={partner.name} />}
              </>
            )}
            <Doodle name="chevron-down" size={12} className="space-switch-chevron" />
          </summary>
          {spaces.length > 0 && (
            <div className="space-switch-panel">
              <SpaceList spaces={spaces} />
            </div>
          )}
        </details>
      </nav>
      <nav className="tabbar" aria-label="Main">
        {LINKS.filter((l) => !l.sidebarOnly).map((l, i) => (
          <span key={l.href} className="tab-slot" style={{ order: i < 2 ? i : i + 1 }}>
            <Link href={l.href} aria-current={current(l.href)} className="tab-link">
              <Doodle name={l.doodle} size={22} />
              {l.label}
              {l.href === "/notebooks" && notebooks.some((n) => n.isNew) && <span className="new-dot" aria-label="New in a notebook" />}
            </Link>
          </span>
        ))}
        <span className="tab-slot" style={{ order: 2 }}>
          <button type="button" className="tab-mic" onClick={record} aria-label="Record a voice memo" disabled={Boolean(active)}>
            <Doodle name="mic" size={24} />
          </button>
        </span>
      </nav>
    </>
  );
}
