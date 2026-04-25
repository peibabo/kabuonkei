import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "株温計 - 今日の相場、熱い？冷たい？",
    short_name: "株温計",
    description:
      "日本市場と米国市場のセンチメントを 1 画面で俯瞰できる日本語ダッシュボード。",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fafaf7",
    theme_color: "#1f2937",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
