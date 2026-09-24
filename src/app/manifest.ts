import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "posted.",
    short_name: "posted.",
    description: "A private place for two.",
    start_url: "/",
    display: "standalone",
    background_color: "#ECEDE6",
    theme_color: "#ECEDE6",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
