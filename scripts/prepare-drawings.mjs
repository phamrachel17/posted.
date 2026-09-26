// Turns the hand drawings in /drawings into app-ready files in /public/doodles.
//
//   node scripts/prepare-drawings.mjs
//
// Each drawing is cropped to its ink, padded, and resized. Small icons get their
// lines thickened a little so they survive being shown at 16–24px. The app colors
// every drawing with a CSS mask, so only the transparency matters, not the color.
//
// To add a drawing: put the PNG (transparent background) in /drawings, add a line
// to OUTPUTS below, and run the script.

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const OUTPUTS = [
  // file in /drawings      name in the app       shape           px    thicken (source px)
  { src: "dancing_couple.PNG", name: "logo", shape: "natural", size: 900, thicken: 3 },
  { src: "dancing_couple.PNG", name: "logo-small", shape: "natural", size: 240, thicken: 10 },
  { src: "flower.PNG", name: "nav-today", shape: "square", size: 160, thicken: 0 },
  { src: "house.PNG", name: "nav-scrapbook", shape: "square", size: 160, thicken: 60, boost: 7 },
  { src: "sea_otters.PNG", name: "nav-bucket", shape: "square", size: 160, thicken: 110, boost: 16 },
  { src: "today.PNG", name: "empty-today", shape: "natural", size: 360, thicken: 0 },
  { src: "notebook.PNG", name: "nav-notebooks", shape: "square", size: 160, thicken: 14 },
  { src: "notebook.PNG", name: "empty-notebook", shape: "natural", size: 360, thicken: 0 },
  { src: "language.PNG", name: "empty-lessons", shape: "natural", size: 480, thicken: 2 },
  { src: "language.PNG", name: "nb-language", shape: "square", size: 160, thicken: 18 },
  { src: "music.PNG", name: "nb-music", shape: "square", size: 160, thicken: 14 },
  { src: "movie.PNG", name: "nb-popcorn", shape: "square", size: 160, thicken: 6 },
  { src: "book.PNG", name: "nb-reading", shape: "square", size: 160, thicken: 16 },
  { src: "cooking.PNG", name: "nb-cooking", shape: "square", size: 160, thicken: 26 },
  { src: "exercise.PNG", name: "nb-exercise", shape: "square", size: 160, thicken: 24 },
  { src: "yoga.PNG", name: "nb-yoga", shape: "square", size: 160, thicken: 30 },
  { src: "happy_mood.PNG", name: "mood-happy", shape: "square", size: 160, thicken: 20 },
  { src: "calm_mood.PNG", name: "mood-calm", shape: "square", size: 160, thicken: 20 },
  { src: "okay_mood.PNG", name: "mood-okay", shape: "square", size: 160, thicken: 20 },
  { src: "tired_mood.PNG", name: "mood-tired", shape: "square", size: 160, thicken: 20 },
  { src: "stressed_mood.PNG", name: "mood-stressed", shape: "square", size: 160, thicken: 20 },
  { src: "sad_mood.PNG", name: "mood-down", shape: "square", size: 160, thicken: 20 },
  // Heart: reactions, the heart sticker, and the heart stamp.
  { src: "heart.PNG", name: "heart", shape: "square", size: 160, thicken: 8 },
  { src: "heart.PNG", name: "heart-filled", shape: "square", size: 160, thicken: 8, fill: true },
  // Weather, beside each clock and on older My day cards.
  { src: "sun.PNG", name: "weather-clear", shape: "square", size: 160, thicken: 22 },
  { src: "sun.PNG", name: "weather-bright-spells", shape: "square", size: 160, thicken: 22 },
  { src: "cloud.PNG", name: "weather-overcast", shape: "square", size: 160, thicken: 22 },
  { src: "rainy_clouds.PNG", name: "weather-drizzle", shape: "square", size: 160, thicken: 22 },
  { src: "stormy_cloud.PNG", name: "weather-stormy", shape: "square", size: 160, thicken: 22 },
  // Stickers and notebook icons ("d-" for doodle).
  { src: "flower.PNG", name: "d-flower", shape: "natural", size: 360, thicken: 0 },
  { src: "flower_stem.PNG", name: "d-flower-stem", shape: "natural", size: 360, thicken: 0 },
  { src: "butterfly.PNG", name: "d-butterfly", shape: "natural", size: 360, thicken: 4 },
  { src: "strawberries.PNG", name: "d-strawberries", shape: "natural", size: 360, thicken: 4 },
  { src: "swirls.PNG", name: "d-swirls", shape: "natural", size: 360, thicken: 4 },
  { src: "balloon.PNG", name: "d-balloon", shape: "natural", size: 360, thicken: 8 },
  { src: "flower_cat.PNG", name: "d-flower-cat", shape: "natural", size: 360, thicken: 4 },
  { src: "melt_clock.PNG", name: "d-melting-clock", shape: "natural", size: 360, thicken: 2 },
  { src: "doge.PNG", name: "d-dog", shape: "natural", size: 360, thicken: 4 },
  { src: "sea_otters.PNG", name: "d-sea-otters", shape: "natural", size: 420, thicken: 3 },
  { src: "house.PNG", name: "d-house", shape: "natural", size: 420, thicken: 3 },
  { src: "sprig.PNG", name: "d-sprig", shape: "natural", size: 420, thicken: 8 },
  { src: "calm_face.PNG", name: "d-sleepy-face", shape: "natural", size: 300, thicken: 4 },
  { src: "sun.PNG", name: "d-sun", shape: "natural", size: 360, thicken: 8 },
  { src: "cloud.PNG", name: "d-cloud", shape: "natural", size: 360, thicken: 8 },
  { src: "rainy_clouds.PNG", name: "d-rain", shape: "natural", size: 360, thicken: 8 },
  { src: "stormy_cloud.PNG", name: "d-storm", shape: "natural", size: 360, thicken: 8 },
  { src: "saved.PNG", name: "kept", shape: "square", size: 128, thicken: 0 },
  { src: "saved.PNG", name: "nav-kept", shape: "square", size: 128, thicken: 0 },
  { src: "saved.PNG", name: "empty-kept", shape: "natural", size: 240, thicken: 0 },
  { src: "tied_stars.PNG", name: "nav-you-two", shape: "square", size: 160, thicken: 12 },
  { src: "tied_stars.PNG", name: "stars", shape: "natural", size: 360, thicken: 4 },
];

const PAD = 0.08;

/**
 * Bounding box of the drawing's ink. Tiny stray specks (less than half a
 * percent of the ink), such as a dot near the canvas edge, are ignored so they
 * don't stretch the crop.
 */
async function inkBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const cols = new Array(W).fill(0), rows = new Array(H).fill(0);
  let total = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[y * W + x] > 24) {
        cols[x]++;
        rows[y]++;
        total++;
      }
    }
  }
  const span = (counts) => {
    const runs = [];
    let start = -1, sum = 0;
    counts.forEach((c, i) => {
      if (c > 0 && start < 0) (start = i), (sum = 0);
      if (c > 0) sum += c;
      if ((c === 0 || i === counts.length - 1) && start >= 0) {
        runs.push({ from: start, to: c === 0 ? i - 1 : i, sum });
        start = -1;
      }
    });
    const kept = runs.filter((r) => r.sum >= total * 0.005);
    return [Math.min(...kept.map((r) => r.from)), Math.max(...kept.map((r) => r.to))];
  };
  const [left, right] = span(cols);
  const [top, bottom] = span(rows);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function prepare({ src, name, shape, size, thicken, boost = 4, fill = false }) {
  const file = `drawings/${src}`;
  const box = await inkBox(file);
  const pad = Math.round(Math.max(box.width, box.height) * PAD) + thicken;

  // Everything below works on the alpha channel as raw 1-byte pixels,
  // so padding is always transparent (0), never a filled color.
  const crop = await sharp(file).ensureAlpha().extract(box).extractChannel("alpha").raw().toBuffer();

  let w = box.width + pad * 2;
  let h = box.height + pad * 2;
  if (shape === "square") w = h = Math.max(w, h);
  const offX = Math.floor((w - box.width) / 2);
  const offY = Math.floor((h - box.height) / 2);

  let alpha = Buffer.alloc(w * h);
  for (let y = 0; y < box.height; y++) {
    crop.copy(alpha, (y + offY) * w + offX, y * box.width, (y + 1) * box.width);
  }
  const raw = (width, height) => ({ raw: { width, height, channels: 1 } });

  // Thicken lines: blur the alpha, then push partial coverage up to solid. Detailed
  // drawings with fine lines need a stronger push (boost) or the blur just fades them.
  if (thicken > 0) {
    alpha = await sharp(alpha, raw(w, h)).blur(thicken / 2).linear(boost, 0).extractChannel(0).raw().toBuffer();
  }

  // Fill the inside of a closed outline (the heart, when it's been given): everything the
  // outside can't reach without crossing a line becomes solid ink.
  if (fill) {
    const outside = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
    while (stack.length) {
      const p = stack.pop();
      if (outside[p] || alpha[p] > 100) continue;
      outside[p] = 1;
      const x = p % w;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (p >= w) stack.push(p - w);
      if (p < w * (h - 1)) stack.push(p + w);
    }
    for (let i = 0; i < w * h; i++) if (!outside[i]) alpha[i] = 255;
  }

  const scale = size / Math.max(w, h);
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);
  const resized = await sharp(alpha, raw(w, h)).resize(width, height, { kernel: "lanczos3" }).extractChannel(0).raw().toBuffer();

  // Black ink with the drawing's shape as transparency.
  await sharp({ create: { width, height, channels: 3, background: "#000" } })
    .joinChannel(resized, { raw: { width, height, channels: 1 } })
    .png({ compressionLevel: 9 })
    .toFile(`public/doodles/${name}.png`);

  console.log(`${name}.png`.padEnd(22), `${width}×${height}`);
}

mkdirSync("public/doodles", { recursive: true });
for (const output of OUTPUTS) await prepare(output);

// Tell the app which names now have a hand-drawn PNG (these win over placeholder SVGs).
const names = [...new Set(OUTPUTS.map((o) => o.name))].sort();
writeFileSync(
  "src/lib/drawn.ts",
  `// Generated by scripts/prepare-drawings.mjs. Do not edit by hand.\n` +
    `// Doodle names that have a hand-drawn PNG in /public/doodles.\n` +
    `export const DRAWN = new Set<string>(${JSON.stringify(names, null, 2)});\n`,
);
console.log(`src/lib/drawn.ts`.padEnd(22), `${names.length} drawings`);
