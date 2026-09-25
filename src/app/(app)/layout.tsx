import { redirect } from "next/navigation";
import { getMySpaces, getNotebookNews, getNotebooks, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { AppNav } from "@/components/AppNav";
import { NewPostsNotice } from "@/components/NewPostsNotice";
import { PresenceProvider } from "@/components/Presence";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const us = await getUs();
  if (!us) redirect("/welcome");
  const [notebooks, news, mySpaces] = await Promise.all([getNotebooks(), getNotebookNews(), getMySpaces()]);
  const spaces = mySpaces.map((s) => ({
    id: s.space_id,
    myName: s.my_name,
    myInk: s.my_ink,
    partnerName: s.partner_name,
    partnerInk: s.partner_ink,
    active: s.is_active,
  }));

  return (
    <PresenceProvider key={us.space.id} spaceId={us.space.id} meId={us.me.id}>
      <div className="shell">
        <AppNav
          me={{ name: us.me.display_name, style: inkStyle(us.me.ink) }}
          partner={us.partner && { id: us.partner.id, name: us.partner.display_name, style: inkStyle(us.partner.ink) }}
          spaces={spaces}
          notebooks={notebooks.map((n) => ({ slug: n.slug, name: n.name, doodle: n.doodle, isNew: news.has(n.id) }))}
        />
        {children}
        <NewPostsNotice spaceId={us.space.id} meId={us.me.id} partnerName={us.partner?.display_name ?? null} />
      </div>
    </PresenceProvider>
  );
}
