import { getBucketList, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { peopleOf } from "@/lib/people";
import { BucketList } from "@/components/BucketList";

export default async function BucketListPage() {
  const [us, { missing, items }] = await Promise.all([getUs(), getBucketList()]);
  if (!us) return null;

  return (
    <main className="main" style={inkStyle(us.me.ink)}>
      <header className="page-head">
        <h1 className="page-title">Bucket list</h1>
        <p className="hint">Things to do together. Either of you can add to it and check things off, in your own ink.</p>
      </header>
      {missing ? (
        <p className="error-note">
          <b>The bucket list isn&rsquo;t set up yet.</b>
          <span>Run supabase/migrations/20260928000000_bucket_list.sql in Supabase, then refresh.</span>
        </p>
      ) : (
        <BucketList initial={items} people={peopleOf(us)} />
      )}
    </main>
  );
}
