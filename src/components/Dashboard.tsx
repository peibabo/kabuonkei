"use client";

import { useEffect, useState } from "react";
import FearGreedGauge from "./FearGreedGauge";
import VolatilityCard from "./VolatilityCard";
import IndicesCard from "./IndicesCard";
import BondForexCard from "./BondForexCard";
import type { MarketData } from "@/lib/types";

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
      </header>

      {/* メインゲージ */}
      <div className="flex justify-center mb-8">
        <FearGreedGauge data={data.fearGreed} />
      </div>

      {/* ボラティリティ + 主要指数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <VolatilityCard data={data.volatility} />
        <IndicesCard data={data.indices} />
      </div>

      {/* 金利・為替 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BondForexCard bonds={data.bonds} forex={data.forex} />
      </div>

      {/* フッター */}
      <footer className="text-center text-xs text-gray-400 mt-12 py-6 border-t border-gray-200">
        <p className="mb-2">
          当サイトは投資助言を行うものではありません。投資判断はご自身の責任でお願いします。
        </p>
        <p>
          データソース: CNN Business, Yahoo Finance |{" "}
          &copy; {new Date().getFullYear()} 株温計
        </p>
      </footer>
    </div>
  );
}
