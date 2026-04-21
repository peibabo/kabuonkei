"use client";

import {
  getSentimentLevel,
  getSentimentDescription,
  getSentimentColor,
} from "@/lib/sentiment";
import type { FearGreedData, JapanFearGreedData } from "@/lib/types";
import ShareButton from "./share/ShareButton";

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
      ? "5要素総合スコア"
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

function JpFooter({ data }: { data: JapanFearGreedData }) {
  return (
    <>
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500 mb-2 text-center">
          構成要素（{data.availableCount}/5 利用可能）
        </p>
        <div className="space-y-1.5">
          {data.components.map((c) => {
            const compColor = c.available
              ? getSentimentColor(c.score)
              : "#d1d5db";
            return (
              <div
                key={c.id}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: compColor }}
                  />
                  <span
                    className={`truncate ${c.available ? "text-gray-700" : "text-gray-400"}`}
                  >
                    {c.label}
                  </span>
                </div>
                <span
                  className={`font-mono font-semibold ml-2 ${c.available ? "" : "text-gray-400"}`}
                  style={c.available ? { color: compColor } : undefined}
                >
                  {c.available ? c.score : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        5要素の等ウェイト平均 ｜ JPX・Yahoo Financeベース
      </p>
    </>
  );
}
