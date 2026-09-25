import Link from "next/link";
import { notFound } from "next/navigation";
import { getScrapPage, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { Doodle } from "@/components/Doodle";
import { ScrapbookEditor } from "@/components/ScrapbookEditor";

export default async function ScrapPageEditor({ params }: PageProps<"/scrapbook/[id]">) {
  const { id } = await params;
  const [us, page] = await Promise.all([getUs(), getScrapPage(id)]);
  if (!us) return null;
  if (!page) notFound();

  return (
    <main className="main wide" style={inkStyle(us.me.ink)}>
      <Link href="/scrapbook" className="back">
        <Doodle name="back" size={16} />
        Scrapbook
      </Link>
      <ScrapbookEditor page={{ id: page.id, title: page.title }} initialPieces={page.pieces} spaceId={us.space.id} meId={us.me.id} myInk={us.me.ink} />
    </main>
  );
}
