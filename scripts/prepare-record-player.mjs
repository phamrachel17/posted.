// Prepares drawings/record_player_color.png for the record player on Today: keeps
// Rachel's colors, erases the drawn record and tone arm (the app draws its own, so
// they can move), patches the deck where the arm was, and writes
// public/doodles/record-player.png. The record's ellipse and the arm's pivot below
// match that drawing; if it's redrawn, update them. Run: node scripts/prepare-record-player.mjs
import sharp from "sharp";

const src = "drawings/record_player_color.png";
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, N = W * H;
const E = { cx: 273, cy: 471, rx: 218, ry: 104 };
const inEllipse = (x, y, shrink) => ((x-E.cx)/(E.rx-shrink))**2 + ((y-E.cy)/(E.ry-shrink*0.48))**2 <= 1;
const P = [443, 376], C = [406, 508];
const distToSeg = (x, y) => { const vx=C[0]-P[0], vy=C[1]-P[1]; let t=((x-P[0])*vx+(y-P[1])*vy)/(vx*vx+vy*vy); t=Math.max(0,Math.min(1,t)); const dx=x-(P[0]+t*vx), dy=y-(P[1]+t*vy); return Math.hypot(dx,dy); };
const out = Buffer.from(data);
// the arm off the record gets patched with the deck around it
const hole = new Uint8Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y*W+x;
  if (inEllipse(x, y, 9)) { out[i*4+3] = 0; continue; } // the record: the app's goes here (keep the drawn rim)
  if (distToSeg(x, y) < 11 || Math.hypot(x-P[0], y-P[1]) < 20) hole[i] = 1;
}
// Fill the hole inward from its edge using only light deck pixels, so no ink bleeds in.
const light = (i) => out[i*4+3] > 200 && (out[i*4]+out[i*4+1]+out[i*4+2]) / 3 > 120;
let left = hole.reduce((a, b) => a + b, 0);
while (left > 0) {
  const done = [];
  for (let i = 0; i < N; i++) if (hole[i]) {
    const x = i % W; let r=0,g=0,b=0,n=0;
    for (let dy=-2; dy<=2; dy++) for (let dx=-2; dx<=2; dx++) {
      const xx=x+dx, j=i+dy*W+dx; if (xx<0||xx>=W||j<0||j>=N||hole[j]) continue;
      if (!light(j)) continue; r+=out[j*4]; g+=out[j*4+1]; b+=out[j*4+2]; n++;
    }
    if (n >= 3) done.push([i, r/n, g/n, b/n]);
  }
  if (!done.length) break;
  for (const [i, r, g, b] of done) { out[i*4]=r; out[i*4+1]=g; out[i*4+2]=b; out[i*4+3]=255; hole[i]=0; left--; }
}
await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile("public/doodles/record-player.png");
console.log("public/doodles/record-player.png", `${W}×${H}`, left ? `(${left} px unfilled)` : "");
