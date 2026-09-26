import { getKept, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { peopleOf } from "@/lib/people";
import { Doodle } from "@/components/Doodle";
import { KeptNote } from "@/components/KeptNote";
import { PostCard } from "@/components/PostCard";

export default async function KeptPage() {
  const [us, kept] = await Promise.all([getUs(), getKept()]);
  if (!us) return null;
  const people = peopleOf(us);
  const now = new Date();

  return (
    <main className="main" style={inkStyle(us.me.ink)}>
      <header className="page-head">
        <h1 className="page-title">
          <Doodle name="nav-kept" size={40} className="title-icon" />
          Kept
        </h1>
        <p className="hint">Only you can see this page.</p>
      </header>
      {kept.length === 0 ? (
        <div className="empty">
          <Doodle name="empty-kept" size={40} height={70} />
          <b>Nothing kept yet</b>
          <p>
            Keep a post from its &ldquo;&hellip;&rdquo; menu to find it here later.
            {us.partner ? ` ${us.partner.display_name} won't see what you keep.` : ""}
          </p>
        </div>
      ) : (
        kept.map((k) => (
          <div key={k.post.id} className="kept-item">
            <KeptNote postId={k.post.id} note={k.note} />
            <PostCard post={k.post} people={people} viewerTz={us.me.timezone} now={now} />
          </div>
        ))
      )}
    </main>
  );
}
