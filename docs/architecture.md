# コード構成

## `src/lib/` 配下

責務ごとにファイルを分割している。主な役割と公開 API：

- `types.ts`: 型定義の公開エントリポイント（barrel）。実体はドメインごとに `src/lib/types/` 配下へ分割（`common.ts` / `sentiment.ts` / `us-fear-greed.ts` / `japan-fear-greed.ts` / `japan-market.ts` / `similar-days.ts` / `market.ts`）。外部 import パスは `@/lib/types` のまま維持
- `sentiment.ts`: 温度スコア → 温度帯 / 説明 / 色 への判定関数（`getSentimentLevel` / `getSentimentDescription` / `getSentimentColor` / `getSentimentTextClass`）と温度帯一覧 `SENTIMENT_LEVELS`
- `yahoo.ts`: yahoo-finance2 の薄いラッパー（`fetchQuote` / `fetchChart` / 共有インスタンス）。`fetchQuote` は `price` / `change` / `changePercent` に加え `marketTime: number | null`（= Yahoo Finance の `regularMarketTime` を Unix ms に正規化した値）を返す。UI カードに「データ時刻」キャプションを出すための情報源で、`VolatilityData` / `IndexData` / `BondYieldData` / `ForexData` / `CommodityData` いずれも `marketTime` フィールドを持つ（全指標共通の JST 表記で表示）
- `cron-dispatch.ts`: Vercel Cron から GitHub Actions を起動するための定義と処理。`CRON_JOBS`（ジョブ名 → 起動するワークフロー）/ `isAuthorizedCronRequest`（`CRON_SECRET` の検証）/ `dispatchCronJob`（GitHub REST API で `workflow_dispatch`）。呼び出し元は `/api/cron/[job]` Route Handler、時刻は `vercel.json` の `crons`
- `fear-greed.ts`: 米国版 Fear & Greed の取得（`fetchFearGreedIndex`）と VIX ベース推定（`estimateFearGreedFromVix`）
- `indices.ts`: VIX / 主要指数 / 米国10年債利回り / 為替 / コモディティの取得。取得対象のシンボル一覧は `src/lib/indices/symbols.ts`（`VOLATILITY_SYMBOLS` / `INDEX_SYMBOLS` / `BOND_YIELD_SYMBOL` / `FOREX_SYMBOL` / `COMMODITY_SYMBOLS`）に集約
- `market-data.ts`: ダッシュボード用エントリポイント `fetchAllMarketData()`。キャッシュは呼び出し元の `/api/market` Route Handler とトップページ（`src/app/page.tsx`、`Dashboard` に `initialData` として渡す）の ISR（`revalidate = 900`）により行い、この関数自体は都度 fetch する。実体は `market-data/compose.ts`（`buildMarketData` / `formatJstTimestamp` 純粋関数）に分離。`market-data/cache.ts`（`createMemoCache<T>` 汎用 TTL キャッシュ）は将来の再利用のため残置
- `japan-fear-greed/`: 日本版の計算（`thresholds.ts` / `utils.ts` / `normalize.ts` / `aggregate.ts` / `component-builder.ts` / `compute.ts` / `index.ts`）。外部からは `@/lib/japan-fear-greed` から import。`computeJapanFearGreed()` が市場温度（C1 = 日経225 × 125日移動平均乖離）と、別枠に実数で出す需給（海外投資家フロー・信用買い残の 4 週変化）を `components` で返す。`component-builder.ts` は要素の生成。`aggregate.ts` の `mergeMarginWeeks` は JPX の直近数週と信用残の長期履歴をつなぐ。旧 5 要素版の正規化関数（信用倍率・裁定残・ドル円）は過去スナップショットの再計算と試算のために残している
- `historical-stats.ts`: 日米共通の過去統計 JSON アクセサ。`market: "us" | "jp"` を受け、`sp500` / `nikkei225` のデータを統一形状 `stats` に正規化して返す（`getHistoricalStats(market)` / `getStatsForScore(score, market)`）
- `temperature-history.ts` / `japan-temperature-history.ts`: 温度推移 JSON のアクセサ。日本版は `getJapanHistory()`（市場温度の日次推移）と `previousScoreBefore()`（前日比用）
- `japan-market-data.ts`: 日本市場需給 JSON のアクセサ
- `similar-days.ts`: 類似日検索（`findSimilarDays` / 日本・米国のアクセサ / イベントラベル取得）
- `format.ts`: 共通フォーマッタ（`formatReturn` / `returnColorClass` / `formatSignedDelta`: 温度差などの符号付き表示。トップの見出し・温度タイル・銘柄別温度が共用）
- `jst-date.ts`: JST 日付関連の共通ユーティリティ（`formatJstDateLabel` — "M/D(曜)" 形式 / `formatJstDateTimeLabel` — Unix ms → "M/D HH:MM JST" 形式。null/NaN は "—" / `getJstDateKey` — "YYYY-MM-DD" キー / `getJstDayNumber` — JST 通日番号。見出しの日替わりローテーションシード）
- `headline.ts`: トップ画面ヒーロー「今日の見出し」生成の純粋関数（決定木 v2）。`getHeadlineStateKey` でレベル組み合わせを 16 状態キーに写像し、`HEADLINE_POOLS`（base + 昨日比 ±5 のトレンド候補 + 日本レベル 3 日以上連続の streak 候補）から `dayNumber` で決定的に日替わり選択（`buildHeroCopy`）。レベルが違ってもスコア差 < 10 なら `resolveNearBoundary` の接近オーバーライドで `NEAR_POOLS`（「日米ほぼ同温」系）に切替し、境界の丸め誤差を対比として報じない
- `level-streak.ts`: 現在の日本温度レベルの連続営業日数を `japan-temperature-history.json` から計算する純粋関数（`computeJapanLevelStreak`）。`fetchAllMarketData` がサーバ側で呼び、`MarketData.japanLevelStreak` として配信
- `stock-temperature/`: 銘柄別の株価の温度。`score.ts`（`computeStockTemperatureSeries`: 125日MA乖離 ÷ 直近250日の振れ幅 = z 値を ±2σ で 0〜100 に）/ `stats.ts`（前日・週・月比、90日統計、1年分位、順位、ランキング、業種グループ化の純関数）/ `format.ts` / `metadata.ts`（3ページ共通のメタ情報）/ `types.ts`（対象範囲 `UNIVERSES`）/ `index.ts`（`stock-temperatures.json` のアクセサ）。詳細は [docs/features/stock-temperature.md](features/stock-temperature.md)
- `learn-extra-stats.ts`: 解説記事に載せる補足の集計（実現ボラ帯・ドル円の勢いの帯・SQ 週・海外投資家フロー）`learn-extra-stats.json` の型と読み込み。生成は `scripts/_lib/learn-extra-stats.ts`
- `learn-articles.ts`: 解説記事（`/learn/[slug]`）の一覧 `LEARN_ARTICLES`（タイトル・短いタイトル・公開日・更新日）と `latestLearnModifiedAt`。`/learn` 一覧・sitemap・銘柄別ページの関連記事で共有
- `related-reading.ts`: 銘柄別ページの関連記事欄（`buildStockRelatedReading`: 定番 3 本 + 銘柄コードで決まる 3 本）と分析記事の一覧 `ANALYSIS_READINGS`

## `scripts/_lib/` 配下

- `shared.ts`: 生成スクリプト共通のヘルパー（`sleep` / `round1` / `median` / `findForwardPrice` / `buildPeriodStats` / `fetchDailyCloses` / `SENTIMENT_RANGES`）と、`src/lib` 側の `getSentimentLevel` / `estimateFearGreedFromVix` を re-export
- `snapshot-merge.ts`: 旧 5 要素版スナップショット（2026-11 に記録停止）の型 `SnapshotEntry` / `SnapshotFile` と追記の純粋関数（`mergeSnapshotEntry` / `emptySnapshotFile`）。型は backfill・試算スクリプトが使う。追記関数は記録停止後は本番で使っていない（`scripts/__tests__/snapshot-merge.test.ts` でユニットテスト化）
- `cron-health.ts`: 定期実行の見張りの純粋関数（`expectedRuns` で `vercel.json` の cron から起動予定を列挙 / `judgeRun` で workflow_dispatch の実行と突き合わせ / `buildReport` で通知メールを組み立て）。`scripts/check-cron-health.ts`（`npm run check:cron-health`）が使う。`scripts/__tests__/cron-health.test.ts` でユニットテスト化
- `japan-temperature.ts`: 日本版 市場温度（日経225 × 125日移動平均乖離）の日次系列を計算する純粋関数 `computeJapanTemperatureSeries`。過去推移・過去統計・類似日・業種ヒートマップの生成スクリプトが共通で使う。`scripts/__tests__/japan-temperature.test.ts` でユニットテスト化
- `snapshot-backfill.ts`: 旧 5 要素版スナップショット（2026-11 に記録停止）の C2 / C3 を「その日に公表済みだった JPX データ」で再計算する純粋関数（`recomputeEntry` / `weeksAvailableOn` / `availableFrom`）。`scripts/backfill-japan-fg-snapshots.ts`（`npm run backfill:japan-fg`）が使う。`scripts/__tests__/snapshot-backfill.test.ts` でユニットテスト化
- `margin-score-candidates.ts`: 信用倍率スコア（C3）の定義候補（倍率の水準 / 倍率の52週レンジ位置 / 倍率の前週比 / 買残の52週レンジ位置 / 買残の4週変化率）を並べる試算用の純粋関数。`scripts/analyze-margin-score-candidates.ts`（`npm run analyze:margin-score`、永続化なし）が使う。本体のスコア計算からは参照しない。`scripts/__tests__/margin-score-candidates.test.ts` でユニットテスト化
- `trading-date.ts`: 「どの営業日のデータか」を実行時刻ではなく日経225 の最終取引時刻から決める純粋関数（`resolveTradingDate` / `toJstIsoDate`）。スナップショットの日付とアラートの鮮度ガードが共用。`scripts/__tests__/trading-date.test.ts` でユニットテスト化
- `stats-aggregator.ts`: 日米の過去統計生成スクリプトで共通する温度帯別リターン集計関数 `aggregateLevelReturns<K>` に加え、分析記事用の 2D 集計関数 `aggregateJointReturns<K>` を提供。`scripts/__tests__/{stats-aggregator,joint-aggregator}.test.ts` でユニットテスト化
- `supply-temperature-analysis.ts`: 需給の温度（海外投資家フロー 4 週累計・信用買い残の 4 週変化）と市場温度（C1）を、公表の遅れを再現して営業日ごとに並べ、前方リターン・順位相関・回数ベースで集計する試算用の純粋関数。`scripts/analyze-supply-temperature.ts`（`npm run analyze:supply`、Yahoo から日経225 を取得、永続化なし）が使う。本体のスコア計算からは参照しない。`scripts/__tests__/supply-temperature-analysis.test.ts` でユニットテスト化。`buildSupplyDays()` は記事用の集計 `supply-demand-signals.ts` からも使う
- `supply-demand-signals.ts`: 記事 `/analysis/supply-demand-signals` 用の集計（`computeSupplyDemandAnalysis()`）。海外投資家・信用買い残の区切りごとの前方リターン、前半・後半、極端な値の回、市場温度 20 以下の日の分割。`scripts/generate-supply-demand-analysis.ts`（`npm run generate:supply-demand`）が `src/data/supply-demand-analysis.json` に書く
- `score-composition.ts`: 日本版スコアの構成要素の組み合わせ（C1 単独 / C1+C5 / C1+騰落レシオ / C1+25日乖離 など）を過去データで比べる試算用の純粋関数（要素の計算、アラートと同じ状態遷移での通知日の再現、その後のリターン集計）。`scripts/analyze-jp-score-composition.ts`（`npm run analyze:jp-composition`、Yahoo から日経225・ドル円・構成 225 銘柄を取得、永続化なし）が使う。本体のスコア計算からは参照しない。`scripts/__tests__/score-composition.test.ts` でユニットテスト化
- `jpx-common.ts`: JPX 取得系の共通ヘルパ（`JPX_BASE` / `fetchBuffer` / `fetchText` / `firstSheetRows` / `parseNumberCell` / `digitsToIso`）。下記 `jpx-*.ts` が利用
- `jpx-margin.ts`: JPX 信用取引残高 Excel を扱う共通パーサ（週次 `*_mtcurrent.xlsx`（2026-10 下旬〜）用 `parseWeeklyMarginXls` / `extractWeeklyMarginLinks` と、連結履歴 `tvdivq0000015969.xls` 用 `parseHistoryMarginXls` / `extractHistoryExcelUrl` / `excelSerialToIso`）。`generate-japan-market-data.ts` / `backfill-margin-ratio-history.ts` が利用
- `jpx-investor.ts`: JPX 投資部門別売買状況（週次 `stock_1_w_{開始}_{終了}.xlsx`、2026-10 下旬〜の横持ちレイアウト）のパーサ `extractInvestorLinks` / `parseInvestorXlsx`。東証プライムの金額差引を主体別に億円で返す（海外投資家 = 法人+個人、個人 = 現金+信用）。`generate-japan-market-data.ts` が利用。`parseInvestorXlsx` は `market` に「二市場」も渡せる。旧形式（〜2026-09 の `stock_val_1_YYMMW.xls`、年ごとの一覧 `00-00-archives-NN.html`）は `parseLegacyInvestorXls`（Tokyo & Nagoya シートの当週列。見出しの「金額」はセル結合で値より 1 列左）で、`update-investor-flow-history.ts` が過去の推移に使う
- `jpx-listed.ts`: JPX 東証上場銘柄一覧（`data_j.xlsx`）のパーサ `extractListedFileUrl` / `parseListedXlsx`（コード・銘柄名（NFKC）・33業種）。`generate-stock-temperatures.ts` が利用
- `jpx-arbitrage.ts`: JPX 裁定取引に係る現物ポジション（日次 `YYMMDD.xls`）のパーサ `extractArbitrageLinks` / `parseArbitrageXls`。`generate-japan-market-data.ts` が利用
- `portfolio-sim.ts`: 温度連動ポートフォリオのシミュレータ純粋関数（`simulatePortfolio` / `DEFAULT_PORTFOLIO_RULE` / `computeStats` / `computeMaxDrawdown` / `computeSharpe`）
