"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getPortfolioHistory } from "@/lib/portfolio";
import { trackEvent } from "@/lib/analytics";

/**
 * Dashboard 第 5 章（詳しく見る）に配置するポートフォリオ導線カード。
 * 最新 NAV と ベンチマーク比、現在配分を要約表示し、/portfolio へ誘導する。
 *
 * 表示順は「耐震性（最大DD 改善）→ 配分 → α」の順。
 * このルールは強気相場ではリターンで負けやすく、α を全面に出すと読者が
 * 一瞬で離脱するため、リスク抑制という勝ち筋を先頭に置く。
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

  // ベンチマークのドローダウンに対する改善幅（正なら「抑制できた」= 良い）
  const jpDdImprovement =
    jp.stats.benchmarkMaxDrawdown - jp.stats.maxDrawdown;
  const usDdImprovement =
    us.stats.benchmarkMaxDrawdown - us.stats.maxDrawdown;

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
        温度スコアに応じて株/現金比率を月次に切り替える耐震型シミュレーション。
        <span className="text-gray-500">
        一括買い持ち / 月次積立（NISA 積立型） / 温度ルール の 3 戦略比較を公開中。
        結論: 過去10年では<strong className="text-gray-700">積立が温度ルールとほぼ同等</strong>だったので、
        NISA 積立で十分です。
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇯🇵 日本版</div>
          <div className="text-sm font-semibold text-emerald-700">
            最大DD 改善{" "}
            <span className="font-bold">
              +{jpDdImprovement.toFixed(1)}pp
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            ポートフォリオ {jp.stats.maxDrawdown.toFixed(1)}% vs ベンチ{" "}
            {jp.stats.benchmarkMaxDrawdown.toFixed(1)}%
          </div>
          <div className="text-sm mt-2">
            株 <strong>{(jp.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(jp.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{jpBand}）</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            累計 α vs 買い持ち:{" "}
            <span
              className={
                jp.stats.alpha >= 0 ? "text-red-500" : "text-gray-500"
              }
            >
              {jp.stats.alpha >= 0 ? "+" : ""}
              {jp.stats.alpha.toFixed(1)}pp
            </span>
          </div>
        </div>
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇺🇸 米国版</div>
          <div className="text-sm font-semibold text-emerald-700">
            最大DD 改善{" "}
            <span className="font-bold">
              +{usDdImprovement.toFixed(1)}pp
            </span>
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5">
            ポートフォリオ {us.stats.maxDrawdown.toFixed(1)}% vs ベンチ{" "}
            {us.stats.benchmarkMaxDrawdown.toFixed(1)}%
          </div>
          <div className="text-sm mt-2">
            株 <strong>{(us.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(us.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{usBand}）</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            累計 α vs 買い持ち:{" "}
            <span
              className={
                us.stats.alpha >= 0 ? "text-red-500" : "text-gray-500"
              }
            >
              {us.stats.alpha >= 0 ? "+" : ""}
              {us.stats.alpha.toFixed(1)}pp
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
