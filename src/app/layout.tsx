import type { Metadata, Viewport } from "next";
import { Alegreya, Be_Vietnam_Pro, Courier_Prime } from "next/font/google";
import "./globals.css";

const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
});

const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "posted.",
  description: "A private place for two.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ecede6",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${alegreya.variable} ${sans.variable} ${courier.variable}`}>
      <body>{children}</body>
    </html>
  );
}
