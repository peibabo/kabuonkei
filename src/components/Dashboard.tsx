"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FearGreedGauge from "./FearGreedGauge";
import JapanFearGreedGauge from "./JapanFearGreedGauge";
import VolatilityCard from "./VolatilityCard";
import IndicesCard from "./IndicesCard";
import BondForexCard from "./BondForexCard";
import CommodityCard from "./CommodityCard";
import HistoricalStatsCard from "./HistoricalStatsCard";
import JapanHistoricalStatsCard from "./JapanHistoricalStatsCard";
import TemperatureTrendCard from "./TemperatureTrendCard";
import JapanTemperatureTrendCard from "./JapanTemperatureTrendCard";
import SimilarDaysCard from "./SimilarDaysCard";
import InvestorTradingCard from "./InvestorTradingCard";
import ArbitrageBalanceCard from "./ArbitrageBalanceCard";
import MarginTradingCard from "./MarginTradingCard";
import type { MarketData } from "@/lib/types";
import {
  getLatestInvestorTrading,
  getForeignInvestorNetHistory,
  getLatestArbitrageBalance,
  getArbitrageBuyBalanceHistory,
  getLatestMarginTrading,
  getMarginRatioHistory,
} from "@/lib/japan-market-data";
import {
  findSimilarDays,
  getJapanSimilarDaysFile,
  getMarketEvents,
  getUsSimilarDaysFile,
} from "@/lib/similar-days";

export default function Dashboard() {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // 15分ごとに自動更新
    const interval = setInterval(fetchData, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">市場データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">エラー</p>
          <p>{error ?? "データを取得できませんでした"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <header className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          🌡 株温計
        </h1>
        <p className="text-gray-500 mt-2">今日の相場、熱い？冷たい？</p>
        <p className="text-xs text-gray-400 mt-1">
          最終更新: {data.lastUpdated}
        </p>
        <Link
          href="/about"
          className="inline-block mt-2 text-xs text-gray-500 hover:text-gray-800 underline"
        >
          これは何？
        </Link>
      </header>

      {/* メインゲージ（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {data.japanFearGreed && (
          <JapanFearGreedGauge
            data={data.japanFearGreed}
            title="🇯🇵 市場温度（日本）"
          />
        )}
        <FearGreedGauge
          data={data.fearGreed}
          title="🇺🇸 Fear & Greed（米国）"
        />
      </div>

      {/* 温度の推移チャート（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <JapanTemperatureTrendCard
          currentScore={data.japanFearGreed?.score ?? 50}
        />
        <TemperatureTrendCard
          vixChart={data.volatility[0]?.chart ?? []}
          currentScore={data.fearGreed.score}
        />
      </div>

      {/* 過去の統計（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {data.japanFearGreed && (
          <JapanHistoricalStatsCard
            currentScore={data.japanFearGreed.score}
          />
        )}
        <HistoricalStatsCard currentScore={data.fearGreed.score} />
      </div>

      {/* 今日の類似日（日本版 / 米国版 2列配置） */}
      {(() => {
        const events = getMarketEvents();
        const japanFile = getJapanSimilarDaysFile();
        const usFile = getUsSimilarDaysFile();
        const japanScore = data.japanFearGreed?.score ?? null;
        const usScore = data.fearGreed.score;
        const japanMatches =
          japanScore != null
            ? findSimilarDays(japanScore, japanFile.daily, events, 5)
            : [];
        const usMatches = findSimilarDays(usScore, usFile.daily, events, 5);
        if (japanMatches.length === 0 && usMatches.length === 0) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {japanScore != null && japanMatches.length > 0 && (
              <SimilarDaysCard
                title="🇯🇵 今日の類似日（日本版）"
                subtitle="今日の温度に最も近かった過去の日と、その後の日経225"
                currentScore={japanScore}
                similarDays={japanMatches}
                marketLabel="日経225"
                dataRangeFrom={japanFile.dataRange.from}
                dataRangeTo={japanFile.dataRange.to}
              />
            )}
            {usMatches.length > 0 && (
              <SimilarDaysCard
                title="🇺🇸 今日の類似日（米国版）"
                subtitle="今日の温度に最も近かった過去の日と、その後のS&P500"
                currentScore={usScore}
                similarDays={usMatches}
                marketLabel="S&P500"
                dataRangeFrom={usFile.dataRange.from}
                dataRangeTo={usFile.dataRange.to}
              />
            )}
          </div>
        );
      })()}

      {/* 投資主体別売買動向 + 裁定残 + 信用倍率 */}
      {(() => {
        const latestInvestor = getLatestInvestorTrading();
        const foreignHistory = getForeignInvestorNetHistory();
        const latestArbitrage = getLatestArbitrageBalance();
        const buyHistory = getArbitrageBuyBalanceHistory();
        const latestMargin = getLatestMarginTrading();
        const marginHistory = getMarginRatioHistory();
        if (!latestInvestor && !latestArbitrage && !latestMargin) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {latestInvestor && (
              <InvestorTradingCard
                latest={latestInvestor}
                foreignHistory={foreignHistory}
              />
            )}
            {latestArbitrage && (
              <ArbitrageBalanceCard
                latest={latestArbitrage}
                buyHistory={buyHistory}
              />
            )}
            {latestMargin && (
              <MarginTradingCard
                latest={latestMargin}
                ratioHistory={marginHistory}
              />
            )}
          </div>
        );
      })()}

      {/* ボラティリティ + 主要指数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <VolatilityCard data={data.volatility} />
        <IndicesCard data={data.indices} />
      </div>

      {/* 金利・為替 + コモディティ・暗号資産 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BondForexCard bonds={data.bonds} forex={data.forex} />
        <CommodityCard data={data.commodities} />
      </div>

      {/* フッター */}
      <footer className="text-center text-xs text-gray-400 mt-12 py-6 border-t border-gray-200">
        <p className="mb-2">
          当サイトは投資助言を行うものではありません。過去の統計・類似日のリターンは過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任でお願いします。
        </p>
        <p>
          データソース: CNN Business, Yahoo Finance, JPX |{" "}
          &copy; {new Date().getFullYear()} 株温計
        </p>
      </footer>
    </div>
  );
}
