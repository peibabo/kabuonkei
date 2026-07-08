"use client";

import Link from "next/link";
import { getTopSectorsForScore } from "@/lib/japan-sector-heatmap";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";

interface Props {
  japanScore: number | null;
}

const RANK_BADGES = ["🥇", "🥈", "🥉", "④", "⑤"];

/**
 * Dashboard「詳しく見る」章のセクター導線カード（コンパクト版）。
 * 現在温度帯の TOP5 だけを見せ、17業種 × 5温度帯のフルヒートマップは
 * /sectors 専用ページへ誘導する。
 */
export default function SectorHeatmapCard({ japanScore }: Props) {
  if (japanScore == null) return null;

  const topRankings = getTopSectorsForScore(japanScore, "3m", 5);
  if (topRankings.length === 0) return null;

  const currentLevel = getSentimentLevel(japanScore);
  const currentColor = getSentimentColor(japanScore);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-lg font-bold text-gray-900">
          🇯🇵 温度帯別の業種パフォーマンス
        </h2>
        <Link
          href="/sectors?ref=dashboard_teaser"
          onClick={() =>
            trackEvent("sector_heatmap_teaser_click", { placement: "dashboard" })
          }
          className="text-xs text-sky-700 underline hover:text-sky-900"
        >
          フルヒートマップを見る →
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        日本版温度が同じだったとき、どの業種が3ヶ月後に強かったか（TOPIX-17 連動 ETF ベース）
      </p>

      <div
        className="rounded-lg p-4"
        style={{
          borderLeft: `4px solid ${currentColor}`,
          backgroundColor: `${currentColor}10`,
        }}
      >
        <p className="text-xs text-gray-600 mb-2">
          現在の「
          <span className="font-bold" style={{ color: currentColor }}>
            {currentLevel}
          </span>
          」帯で過去3ヶ月後の平均リターン TOP5
        </p>
        <div className="flex flex-wrap gap-2">
          {topRankings.map((r, i) => (
            <div
              key={r.sector.code}
              className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm shadow-sm border border-gray-200"
            >
              <span>{RANK_BADGES[i]}</span>
              <span className="font-medium text-gray-900">
                {r.sector.name}
              </span>
              <span className={returnColorClass(r.stats.avgReturn)}>
                {formatReturn(r.stats.avgReturn)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        ※ 過去10年の集計。将来のリターンを保証するものではありません。17業種 × 5温度帯の全体は
        <Link href="/sectors" className="underline hover:text-gray-600 ml-1">
          業種別ヒートマップ
        </Link>
        で。
      </p>
    </div>
  );
}
