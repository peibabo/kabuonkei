- 日本語でやり取りをお願いします。
- git commitをする前に修正内容をもとに必要であればREADME及びCLAUDE.mdを修正してください。
- docs/配下のドキュメントに関する修正が行われた場合は、ドキュメントも更新してください。
- git commitをする前に必ず `npm run test:run` を実行し、全テストがパスすることを確認してください。テストが失敗した場合はコミットせず、修正してください。
- git commit, push, PR作成まで続けてやってください。
- 株温計（kabuonkei）は日本向けのサイトなので時間はJSTベースでお願いします。
- **主要イベント（`events-meta.json`）は自動追加しない運用**。新規イベントの追加・命名・解説本文は毎回人間判断。ただし Claude 側はセッション開始時や CEO レビュー時に直近の市場状況をざっと確認し、以下の条件に該当する日があれば **こちらからリマインド** すること：日経225 前日比 ≤ -5% / VIX 前日比 +50% / 株温計スコア ≤ 10 or ≥ 90 / メディアが通称を付けた大型政策イベント。リマインドの際は候補日付・想定ラベル・根拠を提示し、追加するか確認する。

## プロジェクト構成

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **yahoo-finance2** (v3) でVIX・主要指数・為替・米国債利回りを取得
- **CNN Fear & Greed API** でセンチメントデータを取得
- **Recharts** でミニチャート描画
- **Vitest + Testing Library** でテスト
- APIキャッシュ: `/api/market` Route Handler の ISR（`revalidate = 900` 秒 = 15 分）
- デプロイ先: Vercel（予定）

## 温度スコアの2本立て

株温計には2種類の市場温度スコアがある。

### Fear & Greed（米国版）
- ソース: CNN Fear & Greed API（bot検知でブロックされた場合はVIXベースの簡易推定にフォールバック）
- 計算: `src/lib/fear-greed.ts::fetchFearGreedIndex()` / `estimateFearGreedFromVix()`
- 実質的に米国市場（S&P500）のセンチメントを示す

### 市場温度（日本版）
- ソース: 5要素の等ウェイト平均（すべて既存データで算出）
  1. **日経225モメンタム**: 125日移動平均との乖離率（C1）
  2. **海外投資家フロー**: 直近4週の売買差引累計（C2、億円）
  3. **信用倍率**: 買残÷売残（C3）
  4. **裁定残バランス**: 買残÷(買残+売残)（C4）
  5. **ドル円モメンタム**: 50営業日モメンタム（C5、%）
- 計算: `src/lib/japan-fear-greed/` 配下（公開 API は `@/lib/japan-fear-greed` から import）。エントリポイントは `computeJapanFearGreed()`
- 閾値定数: `JAPAN_FG_THRESHOLDS`（`src/lib/japan-fear-greed/thresholds.ts`）
- 欠損処理: 利用可能な要素のみで合成。2要素未満の場合はnullを返す
- UI: `src/components/FearGreedGauge.tsx`（`market: "us" | "jp"` の判別ユニオン prop で日米共通。PC は左=日本版 / 右=米国版の 2 列配置。見出しは 🇯🇵 / 🇺🇸 の国旗絵文字付きで国識別を明示）

## 過去統計データ

温度計と統計対象市場を 1:1 で揃える方針（**米国版 = S&P500 / 日本版 = 日経225** の純粋分離）がメイン。クロス分析（米国温度×日経225 / 日本温度×S&P500）は**参考値として別カード**で補助提示する。

### 米国版
- `src/data/historical-stats.json`: VIXベースの温度帯ごとに、S&P500 の将来リターン（1ヶ月/3ヶ月/6ヶ月）を事前計算した静的JSON
- 生成スクリプト: `npm run generate:stats`（`scripts/generate-historical-stats.ts`）

### 日本版
- `src/data/japan-historical-stats.json`: 日本版温度帯ごとの日経225将来リターン
- **簡易版**: C2/C3/C4の過去データが未整備のため、C1（日経225 vs 125日MA）+ C5（USDJPY 50日モメンタム）の2要素版で算出
- 生成スクリプト: `npm run generate:japan-stats`（`scripts/generate-japan-historical-stats.ts`）

### クロス分析（参考値）
- `src/data/cross-historical-stats.json`: 温度計と対象市場を入れ替えた「参考値」の過去統計
  - `directions.usTempJpIdx`: 米国温度（VIX 推定）× 日経225（^N225）
  - `directions.jpTempUsIdx`: 日本温度（C1+C5 簡易 10年）× S&P500（^GSPC）
- 生成スクリプト: `npm run generate:cross-stats`（`scripts/generate-cross-historical-stats.ts`）
- アクセサ: `src/lib/cross-historical-stats.ts`（`getCrossHistoricalStats(direction)` / `getCrossStatsForScore(score, direction)` / `CROSS_DIRECTION_META`）。`direction` は `"usTempJpIdx" | "jpTempUsIdx"`
- UI: `src/components/CrossStatsCard.tsx`（1カードに方向タブ 🇺🇸×🇯🇵 / 🇯🇵×🇺🇸 を置いた単独配置。Dashboard では `StatsSection` の直後）
- **注意**: 温度と対象市場が異なるため、純粋分離の同市場統計より相関が弱い可能性あり。カード冒頭に参考値である旨の注釈を常時表示。日付結合は UTC 日付ベースの簡易結合で、厳密なイベントスタディではない

### 自動更新
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし
- GitHub Actions（`.github/workflows/update-historical-stats.yml`）で毎月1日 JST 9:00に自動実行。米国版・温度推移・日本版・類似日データ・クロス分析の5種を同時生成。変更があればcommit→push→Vercel自動デプロイ。手動実行（workflow_dispatch）も可能

## 温度推移データ

### 米国版
- `src/data/temperature-history.json`: 過去約11ヶ月分のVIX日次データから算出した米国版温度スコア（0-100）の時系列JSON
- 生成スクリプト: `npm run generate:temperature-history`（`scripts/generate-temperature-history.ts`）
- ランタイムの直近30日VIXチャートデータとマージして使用（ハイブリッド方式）
- GitHub Actionsで `historical-stats.json` と同時に自動更新

### 日本版（ハイブリッド方式 B+A）

日本版の温度推移は「簡易10年版」と「本体5要素版の日次スナップショット」の2系列を重ね表示する。

**B: 簡易10年版（`src/data/japan-temperature-history.json`）**
- `^N225` + `USDJPY=X` の過去10年日次データから C1（125日MA乖離）+ C5（50日モメンタム）の2要素等ウェイト平均スコアを算出
- 生成スクリプト: `npm run generate:japan-temperature-history`（`scripts/generate-japan-temperature-history.ts`）
- 平日 JST 17:00 に `snapshot-japan-fg.yml` で本体スナップショットと同時にフル再生成（Area が今日まで連続するように毎営業日リフレッシュ）。月1回 `update-historical-stats.yml` でも再生成（バックアップ）

**A: 本体5要素版の日次スナップショット（`src/data/japan-fg-snapshots.json`）**
- 現時点の5要素フルスコアを `computeJapanFearGreed()` で算出し、日次でJSONに追記
- 生成スクリプト: `npm run snapshot:japan-fg`（`scripts/snapshot-japan-fear-greed.ts`）
- 平日 JST 17:00（東証クローズ後）に `snapshot-japan-fg.yml` で自動実行（同ワークフロー内で簡易版 B も同時に再生成し、両ファイルを1コミットで push）
- 配列は日付昇順、同日エントリが既にあれば上書き

**UI**: `src/components/JapanTemperatureTrendCard.tsx`（1M/3M/6M/1Y/5Y/10Y 切替）。
Recharts の ComposedChart で 簡易版=実線+薄塗り/グレー（背景の文脈データ）、本体版=実線/温度色（直近の生データ・主役）で重ねがけ。Tooltipで各要素スコアを表示。
- `src/lib/japan-temperature-history.ts` の `mergeJapanTemperatureData()` が2系列を統合し、`sliceByDays()` で期間フィルタ
- 温度帯バンド・凡例・期間ボタン・カードヘッダ・チャート軸 props・X軸日付フォーマッタ・期間定数は米国版（`TemperatureTrendCard.tsx`）と共通化され、`src/components/_trend/` 配下に集約（`constants.ts` / `TemperatureLegend.tsx` / `PeriodSwitcher.tsx` / `TrendCardHeader.tsx` / `axisProps.ts` / `renderTemperatureBands.tsx` / `formatXAxisDate.ts` / `periods.ts`）。`periods.ts` は `PeriodConfig<P>` 型と `US_TREND_PERIODS`（4期間）/ `JP_TREND_PERIODS`（6期間）を提供し、各カードが `days` / `labels` / `tickIntervals` を参照する。`axisProps.ts` は `XAxis`/`YAxis` の共通 props（0-100 目盛・灰色 tick・軸線なし）を定数化、`renderTemperatureBands.tsx` は `TEMPERATURE_BANDS` を `ReferenceArea` 群として描画する関数、`TrendCardHeader.tsx` はタイトル + `PeriodSwitcher` を並べるカード上部 UI を共通化する

## 今日の類似日（Similar Days）

今日の温度スコアに最も近かった過去日を TOP5 抽出し、その日からの 1ヶ月/3ヶ月/6ヶ月リターンを併せて表示するナラティブ機能。再訪動機とSNS拡散を狙う。

### データ
- `src/data/japan-similar-days.json`: 11年分の `{ date, score, return1m, return3m, return6m }` 配列（^N225ベース）
- `src/data/us-similar-days.json`: 同上（^GSPCベース）
- `src/data/events-meta.json`: 主要経済イベントのメタ辞書。各エントリは `{ slug, date, label, oneLiner, longDescription? }`。`/events/[slug]` 詳細ページと類似日カードのイベントラベル表示の両方で使用。`longDescription` は Markdown 文字列（段落区切り `\n\n`、強調 `**...**`、リンク可）で、詳細ページで `react-markdown` により描画される SEO 本文
- `src/data/events-enriched.json`: 各イベント日から日経225 / S&P500 の 1M/3M/6M/1Y リターンを事前計算したもの。`scripts/generate-similar-days.ts` が同時出力する
- スコア基準は温度推移と同じ: 日本=C1(125日MA)+C5(50日USDJPYモメンタム)、米国=VIXベース推定
- 生成スクリプト: `npm run generate:similar-days`（`scripts/generate-similar-days.ts`）

### ライブラリ・UI
- アクセサ: `src/lib/similar-days.ts`（`getJapanSimilarDays` / `getUsSimilarDays` / `getMarketEvents` / `findSimilarDays`）。`getMarketEvents` は `src/lib/events.ts::getEventsAsDateMap()` の薄いラッパー（旧 `market-events.json` は `events-meta.json` に統合済み）
- イベント詳細ページ用アクセサ: `src/lib/events.ts`（`getEventsMeta` / `getEventBySlug` / `getEventsAsDateMap` / `getEnrichedEntry`）
- UI: `src/components/SimilarDaysCard.tsx`（日本版/米国版共通、Dashboard で2列配置）。イベントラベル付き行は `/events/[slug]?ref=event_link` へのリンクとして描画
- 検索ロジック: `findSimilarDays(currentScore, history, events, topN)`
  - スコア差が小さい順。同率ならイベントラベル付きを優先、さらに同率なら新しい日付を優先
  - `return3m` が null のエントリ（最近すぎて未到達）は除外
- イベント詳細ページとの紐付けは `src/components/dashboard/SimilarDaysSection.tsx` で `date → slug` マップを注入して行う

## イベント詳細ページ（`/events/[slug]`）

主要な市場イベント（コロナショック / Brexit / 令和のブラックマンデー 等）各日について、その日の日米温度スコアと前後±90日の温度推移、1M/3M/6M/1Y の実リターンを表示する恒久 URL。SEO 資産化（「令和のブラックマンデー 温度」等のクエリ獲得）と類似日カードからの回遊を兼ねる。

### データ
- `src/data/events-meta.json`: 14イベントのメタ（`slug` / `date` / `label` / `oneLiner` / `longDescription`）。`longDescription` は各イベントの「背景・市場心理・その後の示唆」を3段落で書いた Markdown 本文（1本あたり 500〜600字）で、SEO ロングテール流入を狙うための手書きテキスト
- `src/data/events-enriched.json`: 各イベントの 1M/3M/6M/1Y リターンを事前計算したもの。生成は `scripts/generate-similar-days.ts` が同時に出力する（Yahoo Finance から取得した N225 / S&P500 終値を使って `findPriceOnOrAfter` + `findForwardPrice` で計算）
- 古いイベント（2015-08-24 のチャイナショック等）もカバーするため、`YEARS_BACK = 11` で過去データを取得

### UI
- ページ本体: `src/app/events/[slug]/page.tsx`（Server Component。`generateStaticParams` で14件を SSG）。`longDescription` が存在するとき `react-markdown` で「当時の背景と市場心理」セクションを描画する（段落・強調・リンクのみ扱う軽量スタイリング）
- OG 画像: `src/app/events/[slug]/opengraph-image.tsx`（`generateStaticParams` でイベントごとに静的生成、動的ルート分の `●` SSG）
- チャート: `src/components/EventTrendChart.tsx`（`_trend/` の共通部品を再利用した Client Component）
- レンジ切出: `src/lib/japan-temperature-history.ts` の `sliceByDaysAround<T extends { date: string }>(points, centerDate, days)`（日米履歴で共用の汎用版）

### sitemap / 内部リンク
- `src/app/sitemap.ts` がイベント14件の URL を `priority: 0.5` / `changeFrequency: yearly` で追加。インデックスページ `/events` も `priority: 0.7` で追加
- `/events` インデックスページ（`src/app/events/page.tsx`）：14件を日付降順でカード表示し、各カードから `?ref=events_index` 付きで詳細へ遷移
- Dashboard の `SimilarDaysSection` 末尾に「過去の主要イベント一覧（14件）→」リンク（`?ref=similar_days_footer`）
- 全ページ共通 Footer に「主要イベント一覧」を追加
- About ページの「できること」リストからも `/events` にリンク
- 類似日カード（SimilarDaysCard）でイベントラベル付き行は `/events/[slug]?ref=event_link` リンクになる
- X bot（`scripts/post-daily-temperature-tweet.ts`）は TOP1 類似日がイベント付きのときツイート文末にイベントページ URL（`?utm_source=x&utm_campaign=event_link`）を追加する

## 日本市場データ

- `src/data/japan-market-data.json`: JPX公開データから取得した日本市場固有の需給データ
  - **投資主体別売買動向**: 海外投資家・個人・信託銀行・投資信託・事業法人の週次売買差引（億円）
  - **裁定残**: 裁定買い残・売り残の日次データ（百万株）
  - **信用倍率**: 信用買い残・売り残（億円）と信用倍率（= 買残/売残）の週次データ。JPX「信用取引現在高」ページから取得
- 生成スクリプト: `npm run generate:japan-market`（`scripts/generate-japan-market-data.ts`）
- データソース: JPXの統計ページからExcel/CSVをダウンロードしてパース
- **自動更新**: GitHub Actions（`.github/workflows/update-japan-market-data.yml`）で毎週 水・木 JST 17:00 に自動実行。JPX の公表タイミングに合わせており、水 17:00 は同日 15:00 公表の「信用取引現在高」（信用倍率）、木 17:00 は同日 15:30 公表の「投資部門別売買状況」を当日中に取り込む。裁定残は毎営業日 16:00 に T+2 営業日分が公表されるのでどちらの回でも最新が取れる
- これらの週次・日次データは日本版温度スコア（C2/C3/C4）の入力にもなる
- 日本版温度の日次スナップショット（`snapshot:japan-fg`）もこのJSONを入力に使う

## コード構成（src/lib 配下）

責務ごとにファイルを分割している。主な役割と公開 API：

- `types.ts`: 型定義の公開エントリポイント（barrel）。実体はドメインごとに `src/lib/types/` 配下へ分割（`common.ts` / `sentiment.ts` / `us-fear-greed.ts` / `japan-fear-greed.ts` / `japan-market.ts` / `similar-days.ts` / `market.ts`）。外部 import パスは `@/lib/types` のまま維持
- `sentiment.ts`: 温度スコア → 温度帯 / 説明 / 色 への判定関数（`getSentimentLevel` / `getSentimentDescription` / `getSentimentColor`）
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
- `jst-date.ts`: JST 日付関連の共通ユーティリティ（`formatJstDateLabel` — "M/D(曜)" 形式 / `formatJstDateTimeLabel` — Unix ms → "M/D HH:MM JST" 形式。null/NaN は "—"）

`scripts/_lib/shared.ts` には生成スクリプト共通のヘルパー（`sleep` / `round1` / `median` / `findForwardPrice` / `buildPeriodStats` / `fetchDailyCloses` / `SENTIMENT_RANGES`）と、`src/lib` 側の `getSentimentLevel` / `estimateFearGreedFromVix` を re-export。
`scripts/_lib/snapshot-merge.ts` には日本版FGスナップショット追記の純粋関数（`mergeSnapshotEntry` / `emptySnapshotFile`）を分離し、`scripts/__tests__/snapshot-merge.test.ts` でユニットテスト化。
`scripts/_lib/stats-aggregator.ts` には日米の過去統計生成スクリプトで共通する温度帯別リターン集計関数 `aggregateLevelReturns<K>` を分離し、`scripts/__tests__/stats-aggregator.test.ts` でユニットテスト化。

## 公開サイトとしての運用

### ページ構成
- `/` — メインダッシュボード（`src/app/page.tsx` → `Dashboard.tsx`）。データ取得と 15 分ポーリングは `src/components/dashboard/useMarketData.ts`、補助 UI は `src/components/dashboard/{LoadingView,ErrorView,DashboardHeader,DashboardFooter}.tsx` に分離
- `/about` — サイト説明（`src/app/about/page.tsx`）
- `/widget` — 埋め込みウィジェットの案内ページ（`src/app/widget/page.tsx`）。ライブプレビュー + コピー可能な embed HTML（`src/app/widget/_components/EmbedCodeBlock.tsx`）を表示。HTML 生成は純粋関数 `buildEmbedSnippet`（`src/app/widget/_lib/embed-snippet.ts`）に分離してユニットテスト対象化
- `/terms` — 利用規約 + 免責事項（`src/app/terms/page.tsx`）。金融情報サイトのため「投資助言ではない」旨を明記
- `/privacy` — プライバシーポリシー（`src/app/privacy/page.tsx`）
- `/events` — 主要イベント14件のインデックスページ（`src/app/events/page.tsx`）。日付降順でカード表示、各カードから詳細ページ `/events/[slug]?ref=events_index` へ遷移。`StaticPageLayout` ベース
- `/about` `/widget` `/terms` `/privacy` `/events` の外枠（`<main>` + 戻るリンク + `<h1>` + コンテンツ枠）は `src/components/StaticPageLayout.tsx` に共通化されており、各 page は `<StaticPageLayout title="...">` で本文のみを記述する
- 全ページ共通フッター: `src/components/Footer.tsx`（`layout.tsx` で body 直下に配置、`mt-auto` で下端固定）。`/about` `/events` `/widget` `/terms` `/privacy` へのリンクを掲載

### 埋め込みウィジェット画像 API
- `/widget/today` — 400×400 PNG を動的生成する Route Handler（`src/app/widget/today/route.tsx`）。他サイトが `<img src>` で貼れる SEO 資産（被リンク獲得目的）。内部で `fetchAllMarketData()` を呼び、日米の最新スコアを描画
- `export const revalidate = 900` の ISR に加え、`Cache-Control: public, s-maxage=900, stale-while-revalidate=3600` を付与して CDN/ブラウザで多層キャッシュ。大量アクセスでもオリジン到達は最小
- レイアウトは `src/app/widget/today/_components/MiniScoreCard.tsx`（横長カード）を JP / US の 2 段で配置。定数（サイズ・フォントサブセット文字集合）は `src/app/widget/today/_constants.ts`
- フォント取得は `buildNotoSansJpFonts`、ロゴ SVG は `THERMOMETER_SVG` を `/api/og/daily` と共有
- embed HTML のリンクには `?ref=widget` が付与され、GA4 で埋め込み経由流入をセグメント計測可能

### シェア UX（温度カード右上）
- `FearGreedGauge` のタイトル行右上に **📤 共有ボタン**（`src/components/share/ShareButton.tsx`）を配置。日米それぞれから開ける
- クリックで **シェアシート**（`src/components/share/ShareSheet.tsx`）を `createPortal` で body 直下に展開。PC は中央モーダル、モバイルはボトムドロワー（単一 Client Component で Tailwind `md:` ブレークポイントにより位置・形状切替）
- シート内容: `/widget/today` プレビュー画像 + 4 つのアクション（🐦 Xで共有 / 🖼 画像を保存 / 🔗 URLをコピー / 📝 ブログに貼る）+ 埋め込みコード展開 + `/widget` への詳細リンク
- X 共有文言は `buildShareText`（`src/lib/share-text.ts`）が純粋関数で生成。極端温度時は「⚠️ 極寒アラート」「🔥 沸騰アラート」のヘッダーに変化。クリックした市場（JP/US）の行を先頭に並べ、両スコアを含める
- embed HTML は既存の `buildEmbedSnippet`（`src/app/widget/_lib/embed-snippet.ts`）を流用
- a11y: `role="dialog"` + `aria-modal` + focus trap（Tab 循環）+ ESC / オーバーレイクリックで close + `body overflow:hidden` で scroll lock
- GA4 イベント: `share_sheet_open`（シート開いた）と `share`（`method: twitter|url_copy|image_download|embed_copy` + `market: jp|us`）を `src/lib/analytics.ts` の `trackEvent()` 経由で送信
- 共有 URL には `?ref=share&utm_source=x&utm_campaign=share_card` を付与して流入計測

### SEO / 計測
- **metadata**: `src/app/layout.tsx` で title テンプレート / openGraph / twitter card / canonical / google-site-verification を定義。`metadataBase` は `NEXT_PUBLIC_SITE_URL` ベース
- **robots / sitemap**: `src/app/robots.ts` / `src/app/sitemap.ts`。sitemap は `/`, `/about`, `/widget`, `/terms`, `/privacy` の 5 ページ
- **GA4**: `src/components/GoogleAnalytics.tsx`。`NEXT_PUBLIC_GA_ID` 未設定なら何も出さない（開発時の安全策）
- **OG 画像**: `src/app/opengraph-image.tsx` で動的生成（`ImageResponse` + Google Fonts の Noto Sans JP サブセットを fetch）。手動の PNG 配置は不要。フォント取得（`loadGoogleFont` / `buildNotoSansJpFonts`）と温度計アイコン SVG は `src/lib/og/{fonts,thermometer-svg}.ts` に共通化されており、`/api/og/daily` 側も同じモジュールを参照する

### 環境変数
- `NEXT_PUBLIC_SITE_URL` — canonical / OGP / sitemap のベース URL
- `NEXT_PUBLIC_GA_ID` — Google Analytics 4 の測定 ID
- `GOOGLE_SITE_VERIFICATION` — Google Search Console サイト所有権確認コード
- `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` — X（Twitter）Bot 投稿用（OAuth 1.0a User Context、Read and Write 権限）

### X（Twitter）Bot — 朝の寄り前ブリーフィング
- **目的**: 定常流入源として、平日毎朝 JST 7:30 に前営業日引け時点の日米温度＋類似日ナラティブを投稿
- **投稿時刻**: 平日 JST 07:30（UTC 22:30, Sun-Thu）
  - 9:00 以降だと日本市場が開いて「今日の温度」と言えない非対称が生じるため、寄り前時間帯に限定
  - 日本版は `snapshot-japan-fg.yml`（平日17:00 JST）で取得済みのデータを反映 = **前営業日引け時点**
  - 米国版は直前の米国引け（JST 5:00〜6:00）時点の VIX/F&G = 完全確定データ
- **投稿内容**: テキスト中心。極端温度（score ≤ 20 or ≥ 80）時のみ動的生成画像（`/api/og/daily`）を添付
- **投稿スクリプト**: `scripts/post-daily-temperature-tweet.ts`（`npm run post:daily-tweet`、`-- --dry-run` で投稿せず出力確認）
- **動的OG画像**: `src/app/api/og/daily/route.tsx`（`ImageResponse` で日米温度を可視化した1200×630 PNG）
- **自動実行**: `.github/workflows/post-daily-tweet.yml`（cron `30 22 * * 0-4`、手動 workflow_dispatch も可）
- **必要な GitHub Secrets**: `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`（Repository variable として `NEXT_PUBLIC_SITE_URL` も設定）
- **Bot用 X アカウント作成と開発者申請は別作業**（X Developer Portal で Project+App を作り、OAuth 1.0a User Context の Read and Write 権限で 4 つのキーを発行）
- **文字数安全弁**: `estimateWeightedLength()` で加重280字超過時は類似日行を自動省略

`.env.example` を参照。本番は Vercel のプロジェクト設定で環境変数を投入する想定。

## 既知の制約

- **CNN Fear & Greed API**: サーバーサイドからのリクエストをbot検知(418)でブロックする。現在はVIXベースの簡易推定値でフォールバック中
- **日経VI (`^JNV`)**: Yahoo Financeにシンボルが存在しない。別データソース（JPX or J-Quants）が必要
- **yahoo-finance2 v3**: `new YahooFinance()` でインスタンス化が必要（v2の `import yahooFinance from ...` の直接利用は不可）
- **日本版過去統計の非対称性**: 本体の5要素スコアはC2/C3/C4の過去データが未整備のため、過去統計は2要素簡易版で計算している
