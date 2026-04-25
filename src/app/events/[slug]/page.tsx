import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import ReactMarkdown from "react-markdown";
import StaticPageLayout from "@/components/StaticPageLayout";
import EventTrendChart from "@/components/EventTrendChart";
import Breadcrumb from "@/components/Breadcrumb";
import {
  getEventsMeta,
  getEventBySlug,
  getEnrichedEntry,
  getEventPublishedAt,
  getRelatedEvents,
} from "@/lib/events";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import {
  getSimpleHistory,
  sliceByDaysAround,
} from "@/lib/japan-temperature-history";
import { getStaticTemperatureHistory } from "@/lib/temperature-history";
import {
  getSentimentColor,
  getSentimentLevel,
  getSentimentDescription,
} from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import type { EnrichedReturns } from "@/lib/types";

export const dynamic = "error";

const EVENT_CHART_WINDOW_DAYS = 90;

export async function generateStaticParams() {
  return getEventsMeta().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) return { title: "イベント詳細" };
  const title = `${event.label}（${event.date}）の温度とその後の相場`;
  return {
    title,
    description: event.oneLiner,
    openGraph: {
      title,
      description: event.oneLiner,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: event.oneLiner,
    },
  };
}

function ReturnsRow({
  label,
  returns,
}: {
  label: string;
  returns: EnrichedReturns | null;
}) {
  const fields: Array<{ label: string; value: number | null | undefined }> = [
    { label: "1ヶ月後", value: returns?.return1m },
    { label: "3ヶ月後", value: returns?.return3m },
    { label: "6ヶ月後", value: returns?.return6m },
    { label: "1年後", value: returns?.return1y },
  ];
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{label}</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {fields.map((f) => (
          <div key={f.label}>
            <div className="text-xs text-gray-500 mb-1">{f.label}</div>
            <div
              className={`text-lg font-bold ${returnColorClass(f.value)}`}
            >
              {formatReturn(f.value ?? null)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreBadge({
  score,
  marketLabel,
}: {
  score: number | null;
  marketLabel: string;
}) {
  if (score == null) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="text-xs text-gray-500 mb-1">{marketLabel}</div>
        <div className="text-sm text-gray-400">履歴範囲外</div>
      </div>
    );
  }
  const color = getSentimentColor(score);
  const level = getSentimentLevel(score);
  const desc = getSentimentDescription(score);
  return (
    <div
      className="border rounded-lg p-4"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}08` }}
    >
      <div className="text-xs text-gray-500 mb-1">{marketLabel}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold" style={{ color }}>
          {score}
        </div>
        <div className="text-sm font-medium" style={{ color }}>
          {level}
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{desc}</div>
    </div>
  );
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event) notFound();

  const enriched = getEnrichedEntry(slug);

  const jpHistory = getSimpleHistory();
  const jpWindow = sliceByDaysAround(
    jpHistory,
    event.date,
    EVENT_CHART_WINDOW_DAYS,
  );

  const usHistory = getStaticTemperatureHistory();
  const usWindow = sliceByDaysAround(
    usHistory,
    event.date,
    EVENT_CHART_WINDOW_DAYS,
  );

  // イベント日スコア（履歴範囲内のとき）
  const jpScoreOnDay =
    jpHistory.find((p) => p.date === event.date)?.score ?? null;
  const usScoreOnDay =
    usHistory.find((p) => p.date === event.date)?.score ?? null;

  const publishedAt = getEventPublishedAt(event);
  const relatedEvents = getRelatedEvents(event.slug, 3);
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "主要イベント", path: "/events" },
    { name: event.label },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <StaticPageLayout title={`📅 ${event.label}（${event.date}）`}>
      <Script
        id={`breadcrumb-jsonld-${event.slug}`}
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <Breadcrumb items={breadcrumbItems} />
      <p className="text-base">{event.oneLiner}</p>
      <p className="text-xs text-gray-500 not-prose">
        公開日:{" "}
        <time dateTime={publishedAt}>{publishedAt}</time>
      </p>

      {event.longDescription && (
        <section className="mt-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            当時の背景と市場心理
          </h2>
          <div className="text-base leading-relaxed text-gray-800">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="mb-4 last:mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">
                    {children}
                  </strong>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="underline hover:text-gray-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {event.longDescription}
            </ReactMarkdown>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3">
          その日の市場温度
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ScoreBadge score={jpScoreOnDay} marketLabel="🇯🇵 日本（日経225）" />
          <ScoreBadge score={usScoreOnDay} marketLabel="🇺🇸 米国（S&P500）" />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ※ 日本版は C1+C5 簡易スコア、米国版は VIX ベース推定値。履歴範囲外の日付は「履歴範囲外」と表示されます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">
          その後のリターン
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <ReturnsRow label="🇯🇵 日経225" returns={enriched?.jp ?? null} />
          <ReturnsRow label="🇺🇸 S&P500" returns={enriched?.us ?? null} />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ※ リターンは各イベント日の終値から算出。イベント日が休場の場合は直後の営業日の終値を基準にしています。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-6 mb-3">
          前後±{EVENT_CHART_WINDOW_DAYS}日の温度推移
        </h2>
        <div className="grid grid-cols-1 gap-4">
          <EventTrendChart
            title="🇯🇵 日本版（C1+C5 簡易スコア）"
            data={jpWindow.map((p) => ({ date: p.date, score: p.score }))}
            eventDate={event.date}
            lineColor="#ea580c"
            emptyMessage="履歴データ範囲外のため表示できません"
          />
          <EventTrendChart
            title="🇺🇸 米国版（VIX ベース）"
            data={usWindow.map((p) => ({ date: p.date, score: p.score }))}
            eventDate={event.date}
            lineColor="#2563eb"
            emptyMessage="履歴データ範囲外のため表示できません"
          />
        </div>
      </section>

      {relatedEvents.length > 0 && (
        <section className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            関連する歴史的イベント
          </h2>
          <ul className="grid grid-cols-1 gap-3 list-none pl-0">
            {relatedEvents.map((rel) => (
              <li key={rel.slug}>
                <Link
                  href={`/events/${rel.slug}?ref=related`}
                  className="block border border-gray-200 rounded-lg p-3 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
                    <span className="text-xs font-mono text-gray-500">
                      {rel.date}
                    </span>
                    <span className="text-base font-semibold text-gray-900">
                      {rel.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{rel.oneLiner}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
        <p>
          他のイベントと比較したい場合は{" "}
          <Link href="/" className="underline hover:text-gray-900">
            トップページの「今日の類似日」カード
          </Link>
          {" "}から辿れます。一覧は{" "}
          <Link href="/events" className="underline hover:text-gray-900">
            主要イベント一覧
          </Link>
          {" "}から。
        </p>
      </section>
    </StaticPageLayout>
  );
}
