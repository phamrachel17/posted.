import { postmarkParts } from "@/lib/time";
import type { Postmark as PostmarkData } from "@/lib/types";
import { Doodle } from "./Doodle";

export function Postmark({ postmark, isNew, big }: { postmark: PostmarkData; isNew?: boolean; big?: boolean }) {
  if (!postmark?.local) return null;
  const { date, time } = postmarkParts(postmark.local);
  const className = ["postmark", isNew && "is-new", big && "big"].filter(Boolean).join(" ");
  return (
    <div className={className} aria-label={`Posted from ${postmark.city}, ${date} at ${time}`}>
      <div className="postmark-ring" aria-hidden>
        <span className="postmark-city">{postmark.city.toUpperCase()}</span>
        <b>{date}</b>
        <span>{time}</span>
      </div>
      <Doodle name="postmark-lines" size={big ? 52 : 40} />
    </div>
  );
}
