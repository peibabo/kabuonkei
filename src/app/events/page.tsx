import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import { getEventsMeta, getEnrichedEntry } from "@/lib/events";
import { formatReturn, returnColorClass } from "@/lib/format";

export const metadata: Metadata = {
  title: "主要な市場イベント一覧",
  description:
    "株温計が詳細記録している 14 件の主要市場イベント（コロナショック、Brexit、令和のブラックマンデー等）の一覧。各イベントの当時の温度スコア、背景、その後のリターンを時系列で辿れます。",
  openGraph: {
    title: "主要な市場イベント一覧 | 株温計",
    description:
      "コロナショック、Brexit、令和のブラックマンデー等、14 件の主要市場イベントを時系列で一覧。",
  },
};

export default function EventsIndexPage() {
  // 日付の降順（新しい順）で並べる
  const events = [...getEventsMeta()].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <StaticPageLayout title="📅 主要な市場イベント一覧">
      <p className="text-base">
        株温計が記録している過去の主要な市場イベント 14 件です。各イベントの
        ページでは、その日の日米温度スコア、前後 ±90 日の温度推移、1M/3M/6M/1Y
        の実リターン、そして「当時の背景と市場心理」の解説を確認できます。
      </p>
      <p className="text-xs text-gray-500 mt-2">
        ※ 用語の短い定義は{" "}
        <Link href="/glossary#kabuonkei-score" className="underline hover:text-gray-700">
          用語集「市場温度スコア」
        </Link>
        ・{" "}
        <Link href="/glossary#vix" className="underline hover:text-gray-700">
          「VIX」
        </Link>
        ・{" "}
        <Link href="/glossary#similar-days" className="underline hover:text-gray-700">
          「類似日」
        </Link>
        にもまとめています。
      </p>

      <ul className="grid grid-cols-1 gap-3 mt-4 list-none pl-0">
        {events.map((e) => {
          const enriched = getEnrichedEntry(e.slug);
          return (
            <li key={e.slug}>
              <Link
                href={`/events/${e.slug}?ref=events_index`}
                className="block border border-gray-200 rounded-lg p-4 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                  <span className="text-xs font-mono text-gray-500">
                    {e.date}
                  </span>
                  <span className="text-base font-semibold text-gray-900">
                    {e.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{e.oneLiner}</p>
                {enriched && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      🇯🇵 日経 1Y:{" "}
                      <span className={returnColorClass(enriched.jp.return1y)}>
                        {formatReturn(enriched.jp.return1y)}
                      </span>
                    </span>
                    <span>
                      🇺🇸 S&P 1Y:{" "}
                      <span className={returnColorClass(enriched.us.return1y)}>
                        {formatReturn(enriched.us.return1y)}
                      </span>
                    </span>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <section className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
        <p>
          今日の温度とこれらのイベントの類似度は{" "}
          <Link href="/" className="underline hover:text-gray-900">
            トップページの「今日の類似日」カード
          </Link>
          {" "}で確認できます。
        </p>
      </section>
    </StaticPageLayout>
  );
}
