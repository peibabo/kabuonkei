import Dashboard from "@/components/Dashboard";
import { fetchAllMarketData } from "@/lib/market-data";
import type { MarketData } from "@/lib/types";

// /api/market と同じ 15 分ごとの ISR。最初の HTML に温度・見出し・各セクションを含め、
// JavaScript を実行しないクローラー（AI アシスタント等）にも中身が見えるようにする
export const revalidate = 900;

/** 取得が遅いときにページの生成を止めないための上限（超えたらブラウザでの取得に任せる） */
const SERVER_FETCH_TIMEOUT_MS = 20_000;

async function loadInitialMarketData(): Promise<MarketData | null> {
  try {
    const data = await Promise.race([
      fetchAllMarketData(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVER_FETCH_TIMEOUT_MS)),
    ]);
    // クライアントは /api/market の JSON と同じ形を前提にしているので、JSON を通して揃える
    return data ? (JSON.parse(JSON.stringify(data)) as MarketData) : null;
  } catch (error) {
    console.error("トップページの市場データ取得に失敗（ブラウザでの取得に切り替え）:", error);
    return null;
  }
}

export default async function Home() {
  const initialData = await loadInitialMarketData();
  return (
    <main className="flex-1">
      <Dashboard initialData={initialData} />
    </main>
  );
}
