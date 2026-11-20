"use client";

import {
  getSentimentLevel,
  getSentimentDescription,
  getSentimentColor,
} from "@/lib/sentiment";
import type {
  FearGreedData,
  JapanFearGreedComponent,
  JapanFearGreedData,
} from "@/lib/types";
import Link from "next/link";
import { formatOkuYen } from "@/lib/format";
import ShareButton from "./share/ShareButton";
import HistoricalPercentileBadge from "./HistoricalPercentileBadge";

interface SharePartnerData {
  /** もう一方の市場のスコア（共有文言で両方表示するため） */
  partnerScore: number | null;
  partnerLevel: string | null;
}

type Props = (
  | { market: "us"; data: FearGreedData; title?: string }
  | { market: "jp"; data: JapanFearGreedData; title?: string }
) &
  Partial<SharePartnerData>;

const DEFAULT_TITLES = {
  us: "Fear & Greed Index",
  jp: "🇯🇵 市場温度（日本）",
} as const;

export default function FearGreedGauge(props: Props) {
  const { market, data } = props;
  const title = props.title ?? DEFAULT_TITLES[market];

  const isEstimated = market === "us" && data.rating === "estimated";
  const level =
    market === "us" ? getSentimentLevel(data.score) : data.level;
  const description = getSentimentDescription(data.score);
  const color = getSentimentColor(data.score);
  const gradientId = `gaugeGradient-${market}`;

  const subtitleText =
    market === "jp"
      ? "日経225 × 125日移動平均乖離"
      : isEstimated
        ? "VIXベース推定値"
        : "CNN Fear & Greed";
  const subtitleColorClass = isEstimated ? "text-amber-500" : "text-gray-400";

  const japanScore = market === "jp" ? data.score : props.partnerScore ?? null;
  const usScore = market === "us" ? data.score : props.partnerScore ?? null;
  const japanLevel = market === "jp" ? level : props.partnerLevel ?? null;
  const usLevel = market === "us" ? level : props.partnerLevel ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
      <div className="relative mb-4">
        <h2 className="text-lg font-bold text-gray-700 text-center">
          {title}
          <span
            className={`block text-xs font-normal mt-1 ${subtitleColorClass}`}
          >
            {subtitleText}
          </span>
        </h2>
        <ShareButton
          market={market}
          japanScore={japanScore}
          usScore={usScore}
          japanLevel={japanLevel}
          usLevel={usLevel}
        />
      </div>

      {/* ゲージ（市場共通） */}
      <div className="relative w-64 h-40 mx-auto mb-4">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="25%" stopColor="#0ea5e9" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="75%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="100"
            y1="100"
            x2={100 + 65 * Math.cos((Math.PI * (100 - data.score)) / 100)}
            y2={100 - 65 * Math.sin((Math.PI * (100 - data.score)) / 100)}
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="5" fill="#1f2937" />
          <text x="20" y="118" fontSize="8" fill="#9ca3af" textAnchor="middle">
            0
          </text>
          <text x="180" y="118" fontSize="8" fill="#9ca3af" textAnchor="middle">
            100
          </text>
        </svg>
      </div>

      {/* スコアと状態（市場共通） */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold" style={{ color }}>
          {data.score}
        </div>
        <div className="text-2xl font-semibold mt-1" style={{ color }}>
          {level}
        </div>
        <div className="text-base text-gray-500 mt-0.5">（{description}）</div>
        <HistoricalPercentileBadge score={data.score} market={market} />
      </div>

      {/* 下部詳細（市場別） */}
      {props.market === "us" ? (
        <UsFooter data={props.data} isEstimated={isEstimated} />
      ) : (
        <JpFooter data={props.data} />
      )}
    </div>
  );
}

function UsFooter({
  data,
  isEstimated,
}: {
  data: FearGreedData;
  isEstimated: boolean;
}) {
  return (
    <>
      {!isEstimated && (
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-gray-500">前日</div>
            <div className="font-bold text-gray-800">{data.previousClose}</div>
          </div>
          <div>
            <div className="text-gray-500">1週間前</div>
            <div className="font-bold text-gray-800">{data.oneWeekAgo}</div>
          </div>
          <div>
            <div className="text-gray-500">1ヶ月前</div>
            <div className="font-bold text-gray-800">{data.oneMonthAgo}</div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4 text-center">
        {isEstimated
          ? "VIXから推定（CNN APIが利用できない場合の代替値）"
          : "出典: CNN Business"}
      </p>
    </>
  );
}

// 解説記事でも使うため src/lib/format.ts に移した。既存の import 先を変えないよう再エクスポートする
export { formatOkuYen };

function formatSignedPct(pct: number): string {
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

/**
 * 需給の要素を「4週で 5,771億円の売り越し」のような文にする。取れなければ null。
 * 0〜100 の温度にはしない（2026-11-20 の検証で将来リターンとの一貫した関係がなかったため）
 */
export function describeSupply(c: JapanFearGreedComponent): string | null {
  if (!c.available || c.rawValue == null) return null;
  const v = c.rawValue;
  if (c.id === "foreignFlow") {
    if (v === 0) return "4週で売り買いが均衡";
    const amount = formatOkuYen(Math.abs(v)).replace(/^\+/, "");
    return `4週で ${amount}の${v < 0 ? "売り越し" : "買い越し"}`;
  }
  if (c.id === "marginBuyChange") {
    if (v === 0) return "4週で横ばい";
    return `4週で ${Math.abs(v).toFixed(1)}% ${v < 0 ? "減少" : "増加"}`;
  }
  return null;
}

/** 需給の各要素から解説記事へのリンク先 */
const SUPPLY_LEARN_LINKS: Record<string, string> = {
  foreignFlow: "/learn/what-is-investor-flow",
  marginBuyChange: "/learn/what-is-margin-ratio",
};

function JpFooter({ data }: { data: JapanFearGreedData }) {
  const nikkeiMa = data.components.find((c) => c.id === "nikkeiMa");
  const supplyComponents = data.components.filter((c) => c.group === "supply");

  return (
    <>
      {nikkeiMa?.rawValue != null && (
        <p className="border-t border-gray-100 pt-4 text-sm text-gray-600 text-center">
          日経225 は{" "}
          <Link
            href="/glossary#kabuonkei-score"
            className="underline decoration-dotted underline-offset-2 hover:text-gray-900"
          >
            125 日移動平均
          </Link>
          （直近約半年の平均値）から{" "}
          <span className="font-mono font-semibold text-gray-800">
            {formatSignedPct(nikkeiMa.rawValue)}
          </span>
        </p>
      )}

      <div
        className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-3 py-3"
        data-testid="supply-facts"
      >
        <div className="text-xs font-semibold text-gray-700">需給（週次・JPX）</div>
        <dl className="mt-2 space-y-1">
          {supplyComponents.map((c) => {
            const text = describeSupply(c);
            return (
              <div key={c.id} className="flex items-baseline justify-between gap-3 text-xs">
                <dt className="flex-shrink-0">
                  {SUPPLY_LEARN_LINKS[c.id] ? (
                    <Link
                      href={SUPPLY_LEARN_LINKS[c.id]}
                      className={`underline decoration-dotted underline-offset-2 hover:text-gray-900 ${c.available ? "text-gray-700" : "text-gray-400"}`}
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className={c.available ? "text-gray-700" : "text-gray-400"}>{c.label}</span>
                  )}
                </dt>
                <dd className={`text-right ${text ? "font-semibold text-gray-800" : "text-gray-400"}`}>
                  {text ?? "—"}
                </dd>
              </div>
            );
          })}
        </dl>
        <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
          JPX の週次公表で、1〜2 週遅れます。過去の検証でその後の株価との関係が見られなかったため、温度にはせず数字だけ載せています
        </p>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        市場温度 = 日経225 と 125 日移動平均の乖離（±15% を 0〜100） ｜ JPX・Yahoo Financeベース
      </p>
    </>
  );
}
