"use client";

import {
  getSentimentLevel,
  getSentimentDescription,
  getSentimentColor,
} from "@/lib/types";
import type { FearGreedData } from "@/lib/types";

interface Props {
  data: FearGreedData;
}

export default function FearGreedGauge({ data }: Props) {
  const isEstimated = data.rating === "estimated";
  const level = getSentimentLevel(data.score);
  const description = getSentimentDescription(data.score);
  const color = getSentimentColor(data.score);
  // ゲージの角度計算: 0-100を-90度〜90度にマッピング
  const angle = (data.score / 100) * 180 - 90;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 md:p-8">
      <h2 className="text-lg font-bold text-gray-700 mb-4 text-center">
        Fear &amp; Greed Index
        {isEstimated && (
          <span className="block text-xs font-normal text-amber-500 mt-1">
            VIXベース推定値
          </span>
        )}
      </h2>

      {/* ゲージ */}
      <div className="relative w-64 h-36 mx-auto mb-4">
        <svg viewBox="0 0 200 110" className="w-full h-full">
          {/* 背景のアーク */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
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
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* 針 */}
          <line
            x1="100"
            y1="100"
            x2={100 + 65 * Math.cos((angle * Math.PI) / 180)}
            y2={100 - 65 * Math.sin((-angle * Math.PI) / 180)}
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="5" fill="#1f2937" />
          {/* ラベル */}
          <text x="15" y="108" fontSize="8" fill="#9ca3af" textAnchor="start">
            0
          </text>
          <text x="185" y="108" fontSize="8" fill="#9ca3af" textAnchor="end">
            100
          </text>
        </svg>
      </div>

      {/* スコアと状態 */}
      <div className="text-center mb-6">
        <div className="text-5xl font-bold" style={{ color }}>
          {data.score}
        </div>
        <div
          className="text-2xl font-semibold mt-1"
          style={{ color }}
        >
          {level}
        </div>
        <div className="text-base text-gray-500 mt-0.5">{description}</div>
      </div>

      {/* 過去データ（CNN APIから取得時のみ表示） */}
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
    </div>
  );
}
