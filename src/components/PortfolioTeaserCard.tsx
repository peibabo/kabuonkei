"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getPortfolioHistory } from "@/lib/portfolio";
import { trackEvent } from "@/lib/analytics";

/**
 * Dashboard 第 5 章（詳しく見る）に配置するポートフォリオ導線カード。
 * 最新 NAV と 積立（DCA）対比、現在配分を要約表示し、/portfolio へ誘導する。
 *
 * 表示順は「α vs 積立（DCA） → 配分 → 最大DD 改善（vs 買い持ち）」の順。
 * 過去10年のバックテストで温度ルールが DCA を上回ることが判明したため、
 * NISA 積立勢に響く「α vs DCA」を主役に置く。maxDD は補助情報。
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

  // 一括買い持ちベンチマークの DD に対する改善幅（補助情報）
  const jpDdImprovement =
    jp.stats.benchmarkMaxDrawdown - jp.stats.maxDrawdown;
  const usDdImprovement =
    us.stats.benchmarkMaxDrawdown - us.stats.maxDrawdown;
  // 積立(DCA)比の DD 差（正なら温度ルールのほうが深い = 積立のほうが DD 浅い）
  const jpDdVsDca = jp.stats.maxDrawdown - jp.stats.dcaMaxDrawdown;
  const usDdVsDca = us.stats.maxDrawdown - us.stats.dcaMaxDrawdown;

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
        温度スコアに応じて株/現金比率を月次に切り替えるシミュレーション。
        <span className="text-gray-500">
        過去約10年で<strong className="text-gray-700">積立(DCA)を JP +{jp.stats.alphaVsDca.toFixed(0)}pp / US +{us.stats.alphaVsDca.toFixed(0)}pp 上回る</strong>が、
        記事内で<strong>α の大半は「配分の高さ」由来で温度信号の純寄与は限定的</strong>という正直な分解も公開中。
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇯🇵 日本版</div>
          <div className="text-sm font-semibold text-red-600">
            積立 (DCA) 比{" "}
            <span className="font-bold">
              {jp.stats.alphaVsDca >= 0 ? "+" : ""}
              {jp.stats.alphaVsDca.toFixed(1)}pp
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            温度 {jp.stats.totalReturn.toFixed(1)}% / 積立{" "}
            {jp.stats.dcaReturn.toFixed(1)}%
          </div>
          <div className="text-sm mt-2">
            株 <strong>{(jp.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(jp.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{jpBand}）</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            最大DD vs 買い持ち:{" "}
            <span className="text-emerald-700">
              +{jpDdImprovement.toFixed(1)}pp 浅い
            </span>
            {" / "}vs 積立:{" "}
            <span
              className={
                jpDdVsDca > 0 ? "text-amber-700" : "text-emerald-700"
              }
            >
              {jpDdVsDca > 0 ? `+${jpDdVsDca.toFixed(1)}pp 深い` : `${Math.abs(jpDdVsDca).toFixed(1)}pp 浅い`}
            </span>
          </div>
        </div>
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇺🇸 米国版</div>
          <div className="text-sm font-semibold text-red-600">
            積立 (DCA) 比{" "}
            <span className="font-bold">
              {us.stats.alphaVsDca >= 0 ? "+" : ""}
              {us.stats.alphaVsDca.toFixed(1)}pp
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            温度 {us.stats.totalReturn.toFixed(1)}% / 積立{" "}
            {us.stats.dcaReturn.toFixed(1)}%
          </div>
          <div className="text-sm mt-2">
            株 <strong>{(us.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(us.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{usBand}）</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            最大DD vs 買い持ち:{" "}
            <span className="text-emerald-700">
              +{usDdImprovement.toFixed(1)}pp 浅い
            </span>
            {" / "}vs 積立:{" "}
            <span
              className={
                usDdVsDca > 0 ? "text-amber-700" : "text-emerald-700"
              }
            >
              {usDdVsDca > 0 ? `+${usDdVsDca.toFixed(1)}pp 深い` : `${Math.abs(usDdVsDca).toFixed(1)}pp 浅い`}
            </span>
          </div>
        </div>
      </div>
      {hasExtreme && (
        <p className="mt-3 text-xs text-amber-700">
          ⚡ 現在どちらかが極端温度帯。次回リバランスでの配分変動に注意。
        </p>
      )}
    </div>
  );
}
