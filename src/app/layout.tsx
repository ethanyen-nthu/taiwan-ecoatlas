import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { siteUrl } from "@/lib/site";
import { Header } from "@/components/header";
import { TodayBar } from "@/components/today/today";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Taiwan EcoAtlas — Open environmental data, with its limits shown",
    template: "%s · Taiwan EcoAtlas",
  },
  description:
    "Explore Taiwan’s environment and cultural geography through transparent, source-backed maps. 臺灣環境與文化地圖。",
  authors: [{ name: "Ethan Yen 顏名宣" }],
  openGraph: {
    siteName: "Taiwan EcoAtlas 臺灣環境與文化地圖",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>
          <a className="skip-link" href="#main">
            Skip to content / 跳至內容
          </a>
          <Header />
          <TodayBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
