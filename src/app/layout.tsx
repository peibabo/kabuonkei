import type { Metadata } from "next";
import Script from "next/script";
import { preload } from "react-dom";
// フォントは public/fonts/ に自前で置き、fonts.css の @font-face で読み込む（next/font/google は
// ビルド時に Google へ取りに行き、Vercel のビルドキャッシュ起因で失敗することがあったため）。
// 書体やウェイトを変えるときは scripts/download-fonts.ts を直して npm run fonts:download
import "./fonts.css";
import "./globals.css";
import { FONT_PRELOADS } from "./font-preloads";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { buildWebSiteJsonLd } from "@/lib/website-jsonld";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "株温計 - 今日の相場、熱い？冷たい？",
    template: "%s | 株温計",
  },
  description:
    "日本市場と米国市場のセンチメントを1画面で俯瞰できる日本語ダッシュボード。VIX・Fear & Greed・日経225・為替・需給データから「今日の相場の温度」を読み解く。",
  keywords: [
    "Fear and Greed Index",
    "恐怖指数",
    "VIX",
    "日経VI",
    "市場センチメント",
    "株温計",
    "日経225",
    "S&P500",
  ],
  alternates: {
    canonical: "/",
    types: {
      "application/atom+xml": [{ url: "/feed.xml", title: "株温計 Atom フィード" }],
    },
  },
  openGraph: {
    title: "株温計 - 今日の相場、熱い？冷たい？",
    description:
      "市場のセンチメント指標を1画面で俯瞰できる日本語ダッシュボード",
    url: siteUrl,
    siteName: "株温計",
    type: "website",
    locale: "ja_JP",
    // og:image は src/app/opengraph-image.tsx で動的生成され、Next.js が自動で metadata に差し込む
  },
  twitter: {
    card: "summary_large_image",
    title: "株温計 - 今日の相場、熱い？冷たい？",
    description:
      "市場のセンチメント指標を1画面で俯瞰できる日本語ダッシュボード",
    // twitter:image は未指定のまま。対応プラットフォームは og:image にフォールバックする
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  for (const href of FONT_PRELOADS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#fafaf7]">
        <Script
          id="website-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: buildWebSiteJsonLd() }}
        />
        <div className="flex-1">{children}</div>
        <Footer />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
