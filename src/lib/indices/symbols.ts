/**
 * Yahoo Finance から取得するシンボル一覧を集約した定数テーブル。
 *
 * indices.ts の各 fetch 関数が参照する。シンボル追加・削除はこのファイルだけで完結するように意図。
 */

interface SymbolEntry {
  symbol: string;
  name: string;
}

export const VOLATILITY_SYMBOLS: ReadonlyArray<SymbolEntry> = [
  { symbol: "^VIX", name: "VIX（恐怖指数）" },
];

export const INDEX_SYMBOLS: ReadonlyArray<SymbolEntry> = [
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^DJI", name: "ダウ平均" },
  { symbol: "^IXIC", name: "ナスダック" },
  { symbol: "^N225", name: "日経平均" },
  { symbol: "^TPX", name: "TOPIX" },
];

export const BOND_YIELD_SYMBOL: SymbolEntry = {
  symbol: "^TNX",
  name: "米国10年債利回り",
};

export const FOREX_SYMBOL: SymbolEntry & { pair: string } = {
  symbol: "USDJPY=X",
  pair: "USD/JPY",
  name: "ドル円",
};

export const COMMODITY_SYMBOLS: ReadonlyArray<SymbolEntry> = [
  { symbol: "GC=F", name: "金（ゴールド）" },
  { symbol: "CL=F", name: "原油（WTI）" },
  { symbol: "BTC-USD", name: "ビットコイン" },
];
