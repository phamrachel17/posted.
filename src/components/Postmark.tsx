import { postmarkParts } from "@/lib/time";
import type { StampView } from "@/lib/stamps";
import type { Postmark as PostmarkData } from "@/lib/types";
import { Doodle } from "./Doodle";
import { Stamp } from "./Stamp";

type Props = { postmark: PostmarkData; isNew?: boolean; big?: boolean; stamp?: StampView | null };

export function Postmark({ postmark, isNew, big, stamp }: Props) {
  if (!postmark?.local) return null;
  const { date, time } = postmarkParts(postmark.local);
  const className = ["postmark", isNew && "is-new", big && "big", stamp && "has-stamp"].filter(Boolean).join(" ");
  return (
    <div className={className} aria-label={`Posted from ${postmark.city}, ${date} at ${time}`}>
      {stamp && (
        <span className="postmark-stamp">
          <Stamp stamp={stamp} size={big ? "big" : "small"} />
        </span>
      )}
      <div className="postmark-ring" aria-hidden>
        <span className="postmark-city">{postmark.city.toUpperCase()}</span>
        <b>{date}</b>
        <span>{time}</span>
      </div>
      <Doodle name="postmark-lines" size={big ? 60 : 48} />
    </div>
  );
}
