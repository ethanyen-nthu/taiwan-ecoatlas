import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Taiwan EcoAtlas — Open environmental data, with its limits shown",
    template: "%s · Taiwan EcoAtlas",
  },
  description:
    "Explore Taiwan’s environment and cultural geography through transparent, source-backed maps. 臺灣環境與文化地圖。",
  authors: [{ name: "Ethan Yen 顏名宣" }],
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
          {children}
        </Providers>
      </body>
    </html>
  );
}
