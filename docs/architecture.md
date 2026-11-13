# コード構成

## `src/lib/` 配下

責務ごとにファイルを分割している。主な役割と公開 API：

- `types.ts`: 型定義の公開エントリポイント（barrel）。実体はドメインごとに `src/lib/types/` 配下へ分割（`common.ts` / `sentiment.ts` / `us-fear-greed.ts` / `japan-fear-greed.ts` / `japan-market.ts` / `similar-days.ts` / `market.ts`）。外部 import パスは `@/lib/types` のまま維持
- `sentiment.ts`: 温度スコア → 温度帯 / 説明 / 色 への判定関数（`getSentimentLevel` / `getSentimentDescription` / `getSentimentColor` / `getSentimentTextClass`）と温度帯一覧 `SENTIMENT_LEVELS`
- `yahoo.ts`: yahoo-finance2 の薄いラッパー（`fetchQuote` / `fetchChart` / 共有インスタンス）。`fetchQuote` は `price` / `change` / `changePercent` に加え `marketTime: number | null`（= Yahoo Finance の `regularMarketTime` を Unix ms に正規化した値）を返す。UI カードに「データ時刻」キャプションを出すための情報源で、`VolatilityData` / `IndexData` / `BondYieldData` / `ForexData` / `CommodityData` いずれも `marketTime` フィールドを持つ（全指標共通の JST 表記で表示）
- `fear-greed.ts`: 米国版 Fear & Greed の取得（`fetchFearGreedIndex`）と VIX ベース推定（`estimateFearGreedFromVix`）
- `indices.ts`: VIX / 主要指数 / 米国10年債利回り / 為替 / コモディティの取得。取得対象のシンボル一覧は `src/lib/indices/symbols.ts`（`VOLATILITY_SYMBOLS` / `INDEX_SYMBOLS` / `BOND_YIELD_SYMBOL` / `FOREX_SYMBOL` / `COMMODITY_SYMBOLS`）に集約
- `market-data.ts`: ダッシュボード用エントリポイント `fetchAllMarketData()`。キャッシュは呼び出し元の `/api/market` Route Handler 側で ISR（`revalidate = 900`）により行い、この関数自体は都度 fetch する。実体は `market-data/compose.ts`（`buildMarketData` / `formatJstTimestamp` 純粋関数）に分離。`market-data/cache.ts`（`createMemoCache<T>` 汎用 TTL キャッシュ）は将来の再利用のため残置
- `japan-fear-greed/`: 日本版市場温度の計算（`thresholds.ts` / `utils.ts` / `normalize.ts` / `aggregate.ts` / `component-builder.ts` / `compute.ts` / `index.ts`）。外部からは `@/lib/japan-fear-greed` から import。`component-builder.ts` は `buildAvailableComponent` / `buildUnavailableComponent` / `computeWeightedScore` を提供し、`compute.ts` の C1〜C5 構築定型を圧縮
- `historical-stats.ts`: 日米共通の過去統計 JSON アクセサ。`market: "us" | "jp"` を受け、`sp500` / `nikkei225` のデータを統一形状 `stats` に正規化して返す（`getHistoricalStats(market)` / `getStatsForScore(score, market)`）
- `temperature-history.ts` / `japan-temperature-history.ts`: 温度推移 JSON のアクセサと系列マージ
- `japan-market-data.ts`: 日本市場需給 JSON のアクセサ
- `similar-days.ts`: 類似日検索（`findSimilarDays` / 日本・米国のアクセサ / イベントラベル取得）
- `format.ts`: 共通フォーマッタ（`formatReturn` / `returnColorClass`）
- `jst-date.ts`: JST 日付関連の共通ユーティリティ（`formatJstDateLabel` — "M/D(曜)" 形式 / `formatJstDateTimeLabel` — Unix ms → "M/D HH:MM JST" 形式。null/NaN は "—" / `getJstDateKey` — "YYYY-MM-DD" キー / `getJstDayNumber` — JST 通日番号。見出しの日替わりローテーションシード）
- `headline.ts`: トップ画面ヒーロー「今日の見出し」生成の純粋関数（決定木 v2）。`getHeadlineStateKey` でレベル組み合わせを 16 状態キーに写像し、`HEADLINE_POOLS`（base + 昨日比 ±5 のトレンド候補 + 日本レベル 3 日以上連続の streak 候補）から `dayNumber` で決定的に日替わり選択（`buildHeroCopy`）。レベルが違ってもスコア差 < 10 なら `resolveNearBoundary` の接近オーバーライドで `NEAR_POOLS`（「日米ほぼ同温」系）に切替し、境界の丸め誤差を対比として報じない
- `level-streak.ts`: 現在の日本温度レベルの連続営業日数を `japan-fg-snapshots.json` から計算する純粋関数（`computeJapanLevelStreak`）。`fetchAllMarketData` がサーバ側で呼び、`MarketData.japanLevelStreak` として配信
- `stock-temperature/`: 銘柄別の株価の温度。`score.ts`（`computeStockTemperatureSeries`: 125日MA乖離 ÷ 直近250日の振れ幅 = z 値を ±2σ で 0〜100 に）/ `stats.ts`（前日・週・月比、90日統計、1年分位、順位、ランキング、業種グループ化の純関数）/ `format.ts` / `metadata.ts`（3ページ共通のメタ情報）/ `types.ts`（対象範囲 `UNIVERSES`）/ `index.ts`（`stock-temperatures.json` のアクセサ）。詳細は [docs/features/stock-temperature.md](features/stock-temperature.md)

## `scripts/_lib/` 配下

- `shared.ts`: 生成スクリプト共通のヘルパー（`sleep` / `round1` / `median` / `findForwardPrice` / `buildPeriodStats` / `fetchDailyCloses` / `SENTIMENT_RANGES`）と、`src/lib` 側の `getSentimentLevel` / `estimateFearGreedFromVix` を re-export
- `snapshot-merge.ts`: 日本版FGスナップショット追記の純粋関数（`mergeSnapshotEntry` / `emptySnapshotFile`）。`scripts/__tests__/snapshot-merge.test.ts` でユニットテスト化
- `stats-aggregator.ts`: 日米の過去統計生成スクリプトで共通する温度帯別リターン集計関数 `aggregateLevelReturns<K>` に加え、分析記事用の 2D 集計関数 `aggregateJointReturns<K>` を提供。`scripts/__tests__/{stats-aggregator,joint-aggregator}.test.ts` でユニットテスト化
- `jpx-common.ts`: JPX 取得系の共通ヘルパ（`JPX_BASE` / `fetchBuffer` / `fetchText` / `firstSheetRows` / `parseNumberCell` / `digitsToIso`）。下記 `jpx-*.ts` が利用
- `jpx-margin.ts`: JPX 信用取引残高 Excel を扱う共通パーサ（週次 `*_mtcurrent.xlsx`（2026-10 下旬〜）用 `parseWeeklyMarginXls` / `extractWeeklyMarginLinks` と、連結履歴 `tvdivq0000015969.xls` 用 `parseHistoryMarginXls` / `extractHistoryExcelUrl` / `excelSerialToIso`）。`generate-japan-market-data.ts` / `backfill-margin-ratio-history.ts` が利用
- `jpx-investor.ts`: JPX 投資部門別売買状況（週次 `stock_1_w_{開始}_{終了}.xlsx`、2026-10 下旬〜の横持ちレイアウト）のパーサ `extractInvestorLinks` / `parseInvestorXlsx`。東証プライムの金額差引を主体別に億円で返す（海外投資家 = 法人+個人、個人 = 現金+信用）。`generate-japan-market-data.ts` が利用
- `jpx-listed.ts`: JPX 東証上場銘柄一覧（`data_j.xlsx`）のパーサ `extractListedFileUrl` / `parseListedXlsx`（コード・銘柄名（NFKC）・33業種）。`generate-stock-temperatures.ts` が利用
- `jpx-arbitrage.ts`: JPX 裁定取引に係る現物ポジション（日次 `YYMMDD.xls`）のパーサ `extractArbitrageLinks` / `parseArbitrageXls`。`generate-japan-market-data.ts` が利用
- `portfolio-sim.ts`: 温度連動ポートフォリオのシミュレータ純粋関数（`simulatePortfolio` / `DEFAULT_PORTFOLIO_RULE` / `computeStats` / `computeMaxDrawdown` / `computeSharpe`）
