import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveNotebook, createLesson, deleteNotebook } from "@/app/actions/notebooks";
import { getFeed, getLessons, getNotebook, getNotebookNews, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { coverColor } from "@/lib/notebooks";
import { peopleOf } from "@/lib/people";
import { longDate } from "@/lib/time";
import type { LessonMeta } from "@/lib/types";
import { Composer } from "./Composer";
import { Doodle } from "./Doodle";
import { FeedList } from "./FeedList";
import { LessonSheet } from "./LessonSheet";
import { MarkNotebookRead } from "./MarkNotebookRead";
import { NotebookDialog } from "./NotebookDialog";
import { NotebookMark } from "./NotebookMark";
import { PendingPosts } from "./PendingPosts";

export async function NotebookPage({ slug, lessonN }: { slug: string; lessonN?: number }) {
  const [us, notebook] = await Promise.all([getUs(), getNotebook(decodeURIComponent(slug))]);
  if (!us) return null;
  if (!notebook) notFound();

  const isLessons = notebook.kind === "lessons";
  const [posts, lessons, news] = await Promise.all([
    getFeed({ notebookId: notebook.id, kinds: isLessons ? ["note", "photo", "voice", "day"] : undefined }),
    isLessons ? getLessons(notebook.id) : Promise.resolve([]),
    getNotebookNews(),
  ]);
  const people = peopleOf(us);
  const now = new Date();

  const lesson = lessonN ? lessons.find((l) => l.meta.n === lessonN) : lessons[0];
  if (lessonN && !lesson) notFound();

  return (
    <main className={isLessons ? "main wide" : "main"} style={inkStyle(us.me.ink)}>
      <MarkNotebookRead notebookId={notebook.id} hasNews={news.has(notebook.id)} />
      <header className="nb-head" style={{ background: coverColor(notebook.cover) }}>
        <NotebookMark doodle={notebook.doodle} size={44} />
        <div>
          <h1>{notebook.name}</h1>
          {notebook.description && <p>{notebook.description}</p>}
        </div>
        <details className="nb-menu">
          <summary aria-label="Notebook options">
            <Doodle name="more" size={20} />
          </summary>
          <div className="post-menu-panel">
            <NotebookDialog notebook={notebook} trigger={<><Doodle name="pen" size={16} /> Edit notebook</>} />
            <form action={archiveNotebook}>
              <input type="hidden" name="id" value={notebook.id} />
              <button type="submit">
                <Doodle name="archive" size={16} /> Archive
                <span className="hint">Hides it. Its posts stay on Today.</span>
              </button>
            </form>
            <details>
              <summary className="danger"><Doodle name="trash" size={16} /> Delete</summary>
              <form action={deleteNotebook} className="menu-confirm">
                <input type="hidden" name="id" value={notebook.id} />
                <span>Delete {notebook.name}? Its posts move to Today and aren&rsquo;t deleted.</span>
                <button type="submit" className="btn btn-danger">Delete notebook</button>
              </form>
            </details>
          </div>
        </details>
      </header>

      {isLessons ? (
        <div className="lessons">
          <nav className="lesson-list" aria-label="Lessons">
            <form action={createLesson}>
              <input type="hidden" name="notebook_id" value={notebook.id} />
              <input type="hidden" name="slug" value={notebook.slug} />
              <button type="submit" className="btn">
                <Doodle name="plus" size={14} /> New lesson
              </button>
            </form>
            {lessons.map((l) => (
              <Link
                key={l.id}
                href={`/n/${notebook.slug}/lessons/${l.meta.n}`}
                aria-current={l.id === lesson?.id ? "page" : undefined}
              >
                <span>Lesson {l.meta.n}</span>
                <span className="hint">{longDate(l.meta.date).replace(/^\w+, /, "")}</span>
              </Link>
            ))}
          </nav>
          <div className="lesson-main">
            {lesson ? (
              <LessonSheet
                key={lesson.id}
                postId={lesson.id}
                meta={lesson.meta as LessonMeta}
                people={people}
                deleteFrom={lesson.author_id === us.me.id ? notebook.slug : undefined}
              />
            ) : (
              <div className="empty">
                <Doodle name="empty-lessons" size={170} height={151} />
                <b>No lessons yet</b>
                <p>Start one on Sunday. It&rsquo;s numbered and dated for you, and questions from the week carry over.</p>
              </div>
            )}
            <h2 className="section-title">Everything else</h2>
            <Composer spaceId={us.space.id} notebookId={notebook.id} placeholder={`Something for ${notebook.name}…`} people={people} />
            <PendingPosts people={people} viewerTz={us.me.timezone} notebookId={notebook.id} />
            <FeedList posts={posts} people={people} viewerTz={us.me.timezone} now={now} hideNotebook headTodayGroup />
          </div>
        </div>
      ) : (
        <>
          <Composer spaceId={us.space.id} notebookId={notebook.id} placeholder={`Something for ${notebook.name}…`} people={people} />
            <PendingPosts people={people} viewerTz={us.me.timezone} notebookId={notebook.id} />
          {posts.length === 0 ? (
            <div className="empty">
              <Doodle name="empty-notebook" size={150} height={122} />
              <b>{notebook.name} is ready</b>
              <p>The first post decides what this notebook is about.</p>
            </div>
          ) : (
            <FeedList posts={posts} people={people} viewerTz={us.me.timezone} now={now} hideNotebook headTodayGroup />
          )}
        </>
      )}
    </main>
  );
}
