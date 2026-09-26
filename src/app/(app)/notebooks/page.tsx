import Link from "next/link";
import { getNotebookActivity, getNotebookNews, getNotebooks, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { coverColor } from "@/lib/notebooks";
import { spokenTime, localStamp } from "@/lib/time";
import { Doodle } from "@/components/Doodle";
import { NotebookDialog } from "@/components/NotebookDialog";
import { NotebookMark } from "@/components/NotebookMark";
import { SortableShelf } from "@/components/SortableShelf";

export default async function NotebooksPage() {
  const [us, notebooks, activity, news] = await Promise.all([getUs(), getNotebooks(), getNotebookActivity(), getNotebookNews()]);
  if (!us) return null;
  const members = [us.me, us.partner].filter(Boolean);
  const now = new Date();

  return (
    <main className="main wide" style={inkStyle(us.me.ink)}>
      <header className="page-head">
        <h1 className="page-title">
          <Doodle name="nav-notebooks" size={40} className="title-icon" />
          Notebooks
        </h1>
        <p className="hint">One for each thing you share. Posts in a notebook stay in that notebook.</p>
      </header>
      <SortableShelf
        items={notebooks.map((n) => {
          const last = activity.get(n.id);
          const who = last && members.find((m) => m!.id === last.author_id);
          return {
            id: n.id,
            node: (
            <Link href={`/n/${n.slug}`} className="cover" style={{ background: coverColor(n.cover) }}>
              <NotebookMark doodle={n.doodle} size={34} />
              {news.has(n.id) && <span className="new-dot cover-dot" aria-label="New from your partner" />}
              <b>{n.name}</b>
              {n.description && <p>{n.description}</p>}
              <span className="cover-last">
                {who ? (
                  <>
                    <span className="ink-dot" style={inkStyle(who.ink)} />
                    {who.id === us.me.id ? "You" : who.display_name},{" "}
                    {spokenTime(last!.created_at, localStamp(new Date(last!.created_at), who.timezone), us.me.timezone, now)}
                  </>
                ) : (
                  "Nothing yet"
                )}
              </span>
            </Link>
            ),
          };
        })}
      >
        <NotebookDialog
          triggerClassName="cover cover-new"
          trigger={
            <>
              <Doodle name="plus" size={26} />
              <b>Start a notebook</b>
            </>
          }
        />
      </SortableShelf>
      {notebooks.length > 1 && <p className="hint">Drag the covers to put them in any order. The sidebar follows.</p>}
      {notebooks.length === 0 && (
        <p className="hint">
          A notebook is a place for one topic: movies, cooking, Spanish lessons. Everything you post in one still shows up on Today.
        </p>
      )}
    </main>
  );
}
