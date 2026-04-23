"use client";

import Link from "next/link";
import { useMemo } from "react";
import { getPortfolioHistory } from "@/lib/portfolio";
import { trackEvent } from "@/lib/analytics";

/**
 * Dashboard 第 5 章（詳しく見る）に配置するポートフォリオ導線カード。
 * 最新 NAV と ベンチマーク比、現在配分を要約表示し、/portfolio へ誘導する。
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
        温度スコアに応じて株/現金比率を月次に切り替えるシミュレーション。過去10年のバックテストとライブ追跡を公開中。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇯🇵 日本版</div>
          <div className="text-sm">
            株 <strong>{(jp.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(jp.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{jpBand}）</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            α vs 買い持ち:{" "}
            <span
              className={
                jp.stats.alpha >= 0 ? "text-red-500" : "text-green-600"
              }
            >
              {jp.stats.alpha >= 0 ? "+" : ""}
              {jp.stats.alpha.toFixed(1)}pp
            </span>{" "}
            / 最大DD {jp.stats.maxDrawdown.toFixed(1)}%
          </div>
        </div>
        <div className="border border-gray-100 rounded-lg p-3 bg-white">
          <div className="text-xs text-gray-500 mb-1">🇺🇸 米国版</div>
          <div className="text-sm">
            株 <strong>{(us.current.equityRatio * 100).toFixed(0)}%</strong>{" "}
            / 現金 {(us.current.cashRatio * 100).toFixed(0)}%
            <span className="ml-2 text-gray-400">（{usBand}）</span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            α vs 買い持ち:{" "}
            <span
              className={
                us.stats.alpha >= 0 ? "text-red-500" : "text-green-600"
              }
            >
              {us.stats.alpha >= 0 ? "+" : ""}
              {us.stats.alpha.toFixed(1)}pp
            </span>{" "}
            / 最大DD {us.stats.maxDrawdown.toFixed(1)}%
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
