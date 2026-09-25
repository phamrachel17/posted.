// A seamless plaster/cold-press paper tile: periodic noise as a height map,
// lit from the top-left, wrapping at the edges so it tiles with no seams.
import sharp from "sharp";
const N = 512;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
// Periodic gradient (Perlin) noise: smoother and far less grid-like than value noise.
function layer(cells, seed) {
  const r = rng(seed);
  const gx = new Float32Array(cells * cells), gy = new Float32Array(cells * cells);
  for (let i = 0; i < cells * cells; i++) { const a = r() * Math.PI * 2; gx[i] = Math.cos(a); gy[i] = Math.sin(a); }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (ix, iy, dx, dy) => { const k = (iy % cells) * cells + (ix % cells); return gx[k] * dx + gy[k] * dy; };
  const out = new Float32Array(N * N);
  // A random offset per layer so the lattices of different layers don't line up.
  const ox = r() * N, oy = r() * N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = (((x + ox) % N) / N) * cells, py = (((y + oy) % N) / N) * cells;
    const x0 = Math.floor(px), y0 = Math.floor(py), fx = px - x0, fy = py - y0;
    const u = fade(fx), v = fade(fy);
    const n00 = dot(x0, y0, fx, fy), n10 = dot(x0 + 1, y0, fx - 1, fy);
    const n01 = dot(x0, y0 + 1, fx, fy - 1), n11 = dot(x0 + 1, y0 + 1, fx - 1, fy - 1);
    out[y * N + x] = (n00 + (n10 - n00) * u) * (1 - v) + (n01 + (n11 - n01) * u) * v;
  }
  return out;
}
const h = new Float32Array(N * N);
// Mostly small bumps (the "tooth"), a little medium undulation.
for (const [cells, amp, seed] of [[8, 0.5, 11], [16, 0.9, 12], [32, 1.0, 13], [64, 0.75, 14], [128, 0.4, 15], [256, 0.15, 16]]) {
  const l = layer(cells, seed);
  for (let i = 0; i < h.length; i++) h[i] += l[i] * amp;
}
// Light from the top-left, like a window beside the wall.
const L = [-0.55, -0.6, 0.58]; const len = Math.hypot(...L); const [lx, ly, lz] = L.map((v) => v / len);
const S = 5.5; // bump strength
const shade = new Float32Array(N * N);
let mean = 0;
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const hx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)];
  const hy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
  const nx = -hx * S, ny = -hy * S, nz = 1, nl = Math.hypot(nx, ny, nz);
  const v = (nx * lx + ny * ly + nz * lz) / nl;
  shade[y * N + x] = v; mean += v;
}
mean /= N * N;
let sd = 0; for (const v of shade) sd += (v - mean) ** 2; sd = Math.sqrt(sd / shade.length);
// Centre on mid-grey so it only lightens and darkens the page color, never shifts it.
const px = Buffer.alloc(N * N);
for (let i = 0; i < px.length; i++) px[i] = Math.max(0, Math.min(255, Math.round(128 + ((shade[i] - mean) / sd) * 34)));
// The page color is baked in (soft-light, as a designer would blend it), so the wall is an
// ordinary opaque image: it looks the same everywhere, even where the browser shows
// past the top or bottom of the page. Keep PAPER in step with --paper in globals.css.
const PAPER = { r: 0xec, g: 0xed, b: 0xe6 };
const STRENGTH = 0.9;
const soft = (a, b) => (b <= 0.5 ? a - (1 - 2 * b) * a * (1 - a) : a + (2 * b - 1) * ((a <= 0.25 ? ((16 * a - 12) * a + 4) * a : Math.sqrt(a)) - a));
const rgb = Buffer.alloc(N * N * 3);
for (let i = 0; i < N * N; i++) {
  const g = px[i] / 255;
  for (const [k, c] of [[0, PAPER.r], [1, PAPER.g], [2, PAPER.b]]) {
    const base = c / 255;
    rgb[i * 3 + k] = Math.round((base + (soft(base, g) - base) * STRENGTH) * 255);
  }
}
sharp(rgb, { raw: { width: N, height: N, channels: 3 } }).webp({ quality: 82 }).toFile("public/textures/wall.webp").then(() => console.log("ok"));
