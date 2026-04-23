import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";

export const metadata: Metadata = {
  title: "分析記事",
  description:
    "株温計の独自データを使った深掘り分析。信用倍率・需給・温度スコアを掛け合わせて、他では得にくい市場観測を提供します。",
  openGraph: {
    title: "分析記事 | 株温計",
    description:
      "株温計の独自データを使った深掘り分析。信用倍率・需給・温度スコアを掛け合わせた独自集計を公開します。",
  },
  alternates: {
    canonical: "/analysis",
  },
};

interface AnalysisArticle {
  slug: string;
  icon: string;
  title: string;
  description: string;
  dateLabel: string;
}

export default function AnalysisIndexPage() {
  const marginAnalysis = getMarginRatioAnalysis();
  const articles: AnalysisArticle[] = [
    {
      slug: "margin-ratio-temperature",
      icon: "📊",
      title: "信用倍率 × 株温計 — 過去10年の徹底検証",
      description:
        "「信用倍率が高いと危険」は本当か？ JPX 公表の週次データと株温計の 2 軸を過去約 10 年分掛け合わせ、信用倍率水準ごとに翌 1ヶ月/3ヶ月/6ヶ月の日経225 リターンを集計。",
      dateLabel: `最終更新: ${marginAnalysis.generatedAt}`,
    },
  ];

  return (
    <StaticPageLayout title="📊 分析記事">
      <p className="text-base leading-relaxed">
        株温計の独自データ（温度スコアの過去 10 年推移、JPX 需給データ、日経225 リターン）を掛け合わせた深掘り分析を公開しています。どれも、他サイトでは得られない独自集計です。
      </p>

      <ul className="grid grid-cols-1 gap-4 mt-6 list-none pl-0">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/analysis/${a.slug}`}
              className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">
                  {a.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">
                    {a.title}
                  </h2>
                  <p className="text-xs text-gray-400 mb-2">{a.dateLabel}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {a.description}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
        <p>
          まずは{" "}
          <Link href="/" className="underline hover:text-gray-900">
            トップページで今日の温度
          </Link>
          を確認してから読み始めると、分析結果を現在相場に当てはめて考えやすくなります。
        </p>
      </section>
    </StaticPageLayout>
  );
}
