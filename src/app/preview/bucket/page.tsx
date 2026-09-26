import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { BucketList } from "@/components/BucketList";
import { inkStyle } from "@/lib/inks";
import type { BucketItem } from "@/lib/data";

// Sample bucket list for checking the design. Development only; saving won't work here.

export default function BucketPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const at = (days: number) => new Date(Date.UTC(2026, 8, 24) - days * 864e5).toISOString();
  const item = (id: string, body: string, added_by: string, done?: { by: string; days: number }): BucketItem => ({
    id, body, note: null, added_by, created_at: at(60), done_by: done?.by ?? null, done_at: done ? at(done.days) : null,
  });
  const items = [
    item("1", "See the northern lights", "rachel"),
    item("2", "Cook a whole Spanish dinner together, no recipes", "arya"),
    item("3", "Kerry Park at sunset", "arya", { by: "arya", days: 3 }),
    item("4", "Take the ferry to Bainbridge", "rachel"),
    item("5", "Watch the Godfather trilogy in one weekend", "rachel", { by: "rachel", days: 20 }),
  ];
  const people = {
    meId: "rachel",
    spaceId: "s",
    byId: {
      rachel: { name: "Rachel", ink: "blue" as const, timezone: "America/New_York", avatarUrl: null, city: "Brooklyn" },
      arya: { name: "Arya", ink: "verdigris" as const, timezone: "America/Los_Angeles", avatarUrl: null, city: "Seattle" },
    },
  };
  return (
    <div className="shell">
      <AppNav active="/bucket-list" me={{ name: "Rachel", style: inkStyle("blue") }} partner={{ id: "arya", name: "Arya", style: inkStyle("verdigris") }} notebooks={[]} />
      <main className="main" style={inkStyle("blue")}>
        <header className="page-head">
          <h1 className="page-title">Bucket list</h1>
          <p className="hint">Things to do together. Either of you can add to it and check things off, in your own ink.</p>
        </header>
        <BucketList initial={items} people={people} />
      </main>
    </div>
  );
}
