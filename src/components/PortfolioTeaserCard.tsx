"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getPortfolioHistory } from "@/lib/portfolio";
import { trackEvent } from "@/lib/analytics";
import {
  drawdownGapColorClass,
  formatDrawdownGap,
  formatReturn,
  returnColorClass,
} from "@/lib/format";
import type { PortfolioSection } from "@/lib/portfolio";

/** 差（パーセントポイント）を「+19.8 ポイント」の形にする */
function formatPoint(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)} ポイント`;
}

/** 最大の下げ幅の差（DD は負値なので、正 = 温度ルールのほうが下げが小さい） */
function DrawdownGap({ diff }: { diff: number }) {
  return <span className={drawdownGapColorClass(diff)}>{formatDrawdownGap(diff)}</span>;
}

function MarketSummary({
  label,
  portfolio,
  band,
}: {
  label: string;
  portfolio: PortfolioSection;
  band: string;
}) {
  const { stats, current } = portfolio;
  const ddVsBuyHold = stats.maxDrawdown - stats.benchmarkMaxDrawdown;
  const ddVsDca = stats.maxDrawdown - stats.dcaMaxDrawdown;
  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-white">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-sm font-semibold ${returnColorClass(stats.alphaVsDca)}`}>
        毎月の積立より{" "}
        <span className="font-bold">{formatPoint(stats.alphaVsDca)}</span>
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        10 年の累計: この方法 {formatReturn(stats.totalReturn)} / 毎月の積立{" "}
        {formatReturn(stats.dcaReturn)}
      </div>
      <div className="text-sm mt-2">
        今の割合: 株 <strong>{(current.equityRatio * 100).toFixed(0)}%</strong>{" "}
        / 現金 {(current.cashRatio * 100).toFixed(0)}%
        <span className="ml-2 text-gray-400">（{band}）</span>
      </div>
      <div className="text-xs text-gray-500 mt-1 leading-relaxed">
        いちばん大きく下げたとき: 買って持ち続けるより <DrawdownGap diff={ddVsBuyHold} />
        、毎月の積立より <DrawdownGap diff={ddVsDca} />
      </div>
    </div>
  );
}

/**
 * Dashboard 第 5 章（詳しく見る）に配置するポートフォリオ導線カード。
 * 最新 NAV と 積立（DCA）対比、現在配分を要約表示し、/portfolio へ誘導する。
 *
 * 表示順は「α vs 積立（DCA） → 配分 → 最大DD 改善（vs 買い持ち）」の順。
 * NISA 積立勢に響く「α vs DCA」を主役に置く。maxDD は補助情報。
 * 積立との差の大半は配分の高さ由来で、温度信号の純寄与は日米ともマイナス（/portfolio で開示）。
 */
export default function PortfolioTeaserCard() {
  const history = useMemo(() => getPortfolioHistory(), []);
  const jp = history.portfolios.jp;
  const us = history.portfolios.us;

  const jpBand = jp.current.band;
  const usBand = us.current.band;

  const isExtremeJp = jpBand === "極寒" || jpBand === "沸騰";
  const isExtremeUs = usBand === "極寒" || usBand === "沸騰";
  const hasExtreme = isExtremeJp || isExtremeUs;

  const containerClass = hasExtreme
    ? "bg-amber-50 border border-amber-300 rounded-2xl shadow-md p-6"
    : "bg-white rounded-2xl shadow-md p-6";

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-base font-bold text-gray-900">
          🧪 温度連動ポートフォリオ
          <span className="ml-2 text-xs font-normal text-gray-500">
            （シミュレーション）
          </span>
        </h3>
        <Link
          href="/portfolio?ref=dashboard_teaser"
          onClick={() => trackEvent("portfolio_teaser_click", { placement: "dashboard" })}
          className="text-xs text-sky-700 underline hover:text-sky-900"
        >
          詳しく見る →
        </Link>
      </div>

      <p className="text-xs text-gray-600 mb-4 leading-relaxed">
        温度に応じて株と現金の割合を月に 1 回切り替えた場合のシミュレーション。
        過去約 10 年の成績を、毎月同じ額を買い続ける
        <Link href="/glossary#dca" className="underline hover:text-gray-900">
          積立
        </Link>
        と比べると、
        <strong className="text-gray-700">
          日本 {formatPoint(jp.stats.alphaVsDca, 0)} / 米国 {formatPoint(us.stats.alphaVsDca, 0)}
        </strong>
        。ただし差の大半は株の割合が高いことによるもので、温度で切り替えた効果そのものは記事内で分けて検証しています。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MarketSummary label="🇯🇵 日本版" portfolio={jp} band={jpBand} />
        <MarketSummary label="🇺🇸 米国版" portfolio={us} band={usBand} />
      </div>
      {hasExtreme && (
        <p className="mt-3 text-xs text-amber-700">
          ⚡ 今はどちらかが極端な温度帯です。次の月初の切り替えで株と現金の割合が大きく変わることがあります。
        </p>
      )}
    </div>
  );
}
