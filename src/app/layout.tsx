import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "株温計 - 今日の相場、熱い？冷たい？",
  description:
    "日本語版 Fear & Greed ダッシュボード。VIX、日経VI、主要指数、為替、米国債利回りなど市場のセンチメント指標を1画面で俯瞰。",
  keywords: [
    "Fear and Greed Index",
    "恐怖指数",
    "VIX",
    "日経VI",
    "市場センチメント",
    "株温計",
  ],
  openGraph: {
    title: "株温計 - 今日の相場、熱い？冷たい？",
    description:
      "市場のセンチメント指標を1画面で俯瞰できる日本語ダッシュボード",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  );
}
