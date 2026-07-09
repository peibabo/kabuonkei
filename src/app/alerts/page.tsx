import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import AlertSignupForm from "@/components/alerts/AlertSignupForm";
import { ALERT_VARIANTS } from "@/lib/types";
import {
  COLD_THRESHOLD,
  HOT_THRESHOLD,
} from "@/lib/alerts/state-transition";

const PAGE_PATH = "/alerts";
const PAGE_TITLE = "温度アラート — 極寒・過熱をメールでお知らせ";
const PAGE_DESCRIPTION = `株温計の温度アラートは、米国・日本の市場温度が極寒（≤${COLD_THRESHOLD}）または過熱（≥${HOT_THRESHOLD}）に突入した瞬間だけメールで知らせる無料通知サービス。毎日は届かない、本当に極端な日だけの通知です。`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "温度アラート",
    "市場温度",
    "Fear and Greed Index",
    "恐怖指数",
    "VIX",
    "暴落 通知",
    "株 メール通知",
    "株温計",
  ],
  openGraph: {
    title: `${PAGE_TITLE} | 株温計`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: PAGE_PATH,
    locale: "ja_JP",
  },
  alternates: {
    canonical: PAGE_PATH,
  },
};

export default function AlertsPage() {
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "温度アラート" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="alerts-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title="🔔 温度アラート">
        <Breadcrumb items={breadcrumbItems} />

        <p>
          市場の温度が<strong>極寒（≤{COLD_THRESHOLD}）</strong>または<strong>過熱（≥{HOT_THRESHOLD}）</strong>
          に突入したタイミングだけ、メールでお知らせする無料の通知サービスです。
          毎日は届きません。歴史的にリターンの分布が偏る「本当に極端な日」だけをお知らせします。
        </p>

        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            通知のタイミング
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
            <li>米国市場: 平日 07:00 JST（寄り前ブリーフィング）</li>
            <li>日本市場: 平日 17:15 JST（大引け後）</li>
            <li>
              前回が平温で、今回が極端域に突入した時のみ発火（連続発火なし・±5pt のヒステリシス付き）
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">登録する</h2>
          <AlertSignupForm
            defaultVariants={[...ALERT_VARIANTS]}
            source="landing"
          />
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900">よくある質問</h2>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              どのくらいの頻度で届きますか？
            </h3>
            <p className="text-sm mt-1">
              極端域への突入は年に数回程度です。状態が変化した瞬間だけ通知するため、極寒・過熱が続いている間に毎日届くことはありません。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              温度スコアとは何ですか？
            </h3>
            <p className="text-sm mt-1">
              VIX や Fear & Greed Index、日本市場の需給データなどから算出する 0〜100
              の市場センチメント指標です。詳しくは
              <Link
                href="/learn/what-is-fear-greed"
                className="underline hover:text-gray-900"
              >
                「Fear & Greed Index とは？」
              </Link>
              をご覧ください。
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              解除はできますか？
            </h3>
            <p className="text-sm mt-1">
              いつでも通知メール末尾のリンクからワンクリックで解除できます。メールアドレスは通知の送信のみに使用します（
              <Link href="/privacy" className="underline hover:text-gray-900">
                プライバシーポリシー
              </Link>
              ）。
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500">
          本サービスは情報提供のみを目的としており、投資助言・勧誘ではありません。通知をきっかけとした投資判断はご自身の責任でお願いします。
        </p>
      </StaticPageLayout>
    </>
  );
}
