import { readFileSync } from "node:fs";
import { join } from "node:path";

// The app icon is the dancing couple, drawn in pencil ink on the paper color.
const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), "public/doodles/logo-small.png")).toString("base64")}`;

export function IconArt({ size }: { size: number }) {
  const w = Math.round(size * 0.84);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ECEDE6" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img */}
      <img src={logo} width={w} height={Math.round(w * (184 / 240))} alt="" />
    </div>
  );
}
