import type { MetadataRoute } from "next";

/** What a browser needs to offer "Install" and to open the atlas in its own
 *  window. The colours are the page's own paper, so the window frame and the
 *  start-up screen match the site instead of flashing white or black. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Taiwan EcoAtlas 臺灣環境與文化地圖",
    short_name: "EcoAtlas",
    description:
      "Open environmental and cultural data for Taiwan, with its limits shown.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f8f5f1",
    theme_color: "#f8f5f1",
    lang: "en",
    categories: ["education", "science"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Search 搜尋", url: "/search" },
      { name: "Map 地圖", url: "/explore" },
      { name: "Tour 導覽", url: "/tour" },
    ],
  };
}
