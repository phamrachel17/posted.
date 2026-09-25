import type { Ink } from "./inks";

export type Member = {
  id: string;
  space_id: string;
  user_id: string;
  display_name: string;
  ink: Ink;
  city: string;
  timezone: string;
  last_seen_at: string | null;
  daily_letter_hour: number | null;
  avatar_path: string | null;
  avatar_icon: string | null;
  /** A signed link to the picture, filled in when members are loaded. */
  avatar_url?: string | null;
};

export type Space = {
  id: string;
  name: string | null;
  next_visit_on: string | null;
  next_visit_place: string | null;
};

export type Postmark = {
  city: string;
  tz: string;
  /** Author's local wall-clock time, "YYYY-MM-DDTHH:MM:SS". */
  local: string;
};

export type Photo = {
  id: string;
  url: string | null;
  width: number | null;
  height: number | null;
};

export type Audio = {
  id: string;
  url: string | null;
  mime: string;
  duration_ms: number;
  peaks: number[];
};

export type Reaction = { member_id: string; emoji: Emoji };

export const EMOJI = ["heart", "😂", "😭", "😮", "🥹", "👀"] as const;
export type Emoji = (typeof EMOJI)[number];

export type NotebookRef = { id: string; slug: string; name: string; doodle: string | null; kind: "plain" | "lessons" };

export type Notebook = NotebookRef & {
  cover: string | null;
  description: string | null;
  archived_at: string | null;
  created_at: string;
};

export type Weather = "clear" | "bright-spells" | "overcast" | "drizzle" | "stormy";

export type Mood = "happy" | "calm" | "okay" | "tired" | "stressed" | "down";

export type DayMeta = {
  mood?: Mood;
  energy?: number;
  highlight?: string;
  accomplished?: string;
  grateful?: string;
  /** Anything else about the day, in your own words. */
  note?: string;
  /** Older days, from before moods replaced the weather. */
  weather?: Weather;
  today?: string;
  proud?: string;
  thinking?: string;
  tomorrow?: string;
};

export type VocabRow = { term: string; meaning: string; note?: string };
export type HomeworkItem = { text: string; done_by?: string | null };
export type Question = { text: string; by: string; answered?: boolean };

export type LessonMeta = {
  n: number;
  /** "YYYY-MM-DD" */
  date: string;
  teacher_id?: string | null;
  topics: string[];
  vocab: VocabRow[];
  homework: HomeworkItem[];
  questions: Question[];
  notes?: string;
};

export type ReplyPreview = { id: string; author_id: string; body: string | null; hasAudio: boolean };

export type Post = {
  id: string;
  author_id: string;
  kind: "note" | "photo" | "voice" | "day" | "lesson";
  body: string | null;
  meta: Record<string, unknown>;
  postmark: Postmark;
  created_at: string;
  edited_at: string | null;
  notebook: NotebookRef | null;
  photos: Photo[];
  audio: Audio | null;
  reactions: Reaction[];
  latestReply: ReplyPreview | null;
  kept: boolean;
};

export type Reply = {
  id: string;
  author_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  audio: Audio | null;
  reactions: Reaction[];
};

/** Everything a signed-in page needs to know about the two of you. */
export type Us = {
  me: Member;
  partner: Member | null;
  space: Space;
};
