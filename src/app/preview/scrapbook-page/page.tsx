import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ScrapbookEditor } from "@/components/ScrapbookEditor";
import { inkStyle } from "@/lib/inks";
import type { Piece } from "@/lib/data";

// Sample hand-made page for checking the editor. Development only; saving won't work here.

const img = (a: string, b: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><circle cx="130" cy="150" r="60" fill="#e9a659"/></svg>`)}`;

export default function EditorPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const base = { url: null, width: null, height: null, duration_ms: null, sticker: null, body: null, color: null, created_by: "rachel" };
  const pieces: Piece[] = [
    { ...base, id: "a", kind: "photo", url: img("#9db7cf", "#2f4a5f"), x: 6, y: 8, w: 36, rotation: -4, z: 1 },
    { ...base, id: "b", kind: "photo", url: img("#d8c7a0", "#8e6e48"), x: 50, y: 30, w: 32, rotation: 5, z: 2 },
    { ...base, id: "c", kind: "sticker", sticker: "logo", color: "blue", x: 62, y: 6, w: 20, rotation: 0, z: 3 },
    { ...base, id: "d", kind: "sticker", sticker: "stars", color: "verdigris", x: 10, y: 66, w: 10, rotation: -8, z: 4 },
    { ...base, id: "e", kind: "text", body: "Positano, the day it didn't rain", color: "blue", x: 8, y: 50, w: 34, rotation: -3, z: 5 },
    { ...base, id: "f", kind: "sticker", sticker: "empty-today", color: "plum", x: 84, y: 70, w: 9, rotation: 6, z: 6 },
  ];
  return (
    <div className="shell">
      <AppNav active="/scrapbook" me={{ name: "Rachel", style: inkStyle("blue") }} partner={{ id: "arya", name: "Arya", style: inkStyle("verdigris") }} notebooks={[]} />
      <main className="main wide" style={inkStyle("blue")}>
        <ScrapbookEditor page={{ id: "preview", title: "Italy, spring" }} initialPieces={pieces} spaceId="preview" meId="rachel" myInk="blue" />
      </main>
    </div>
  );
}
