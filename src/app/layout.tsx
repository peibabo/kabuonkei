import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { buildWebSiteJsonLd } from "@/lib/website-jsonld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 朝刊スタイルの和文タイポグラフィ。見出し = Serif、本文 = Sans
const notoSerifJp = Noto_Serif_JP({
  variable: "--font-serif-jp",
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

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
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansJp.variable} ${notoSerifJp.variable} h-full antialiased`}
    >
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
