- 日本語でやり取りをお願いします。
- git commitをする前に修正内容をもとに必要であればREADME及びCLAUDE.mdを修正してください。
- docs/配下のドキュメントに関する修正が行われた場合は、ドキュメントも更新してください。
- git commitをする前に必ず `npm run test:run` を実行し、全テストがパスすることを確認してください。テストが失敗した場合はコミットせず、修正してください。
- git commit, push, PR作成まで続けてやってください。
- 株温計（kabuonkei）は日本向けのサイトなので時間はJSTベースでお願いします。
- メモリが増えてきたら良いタイミングでclearの提案をしてください。
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
- `src/data/japan-historical-stats.json`: 日本版温度帯ごとの日経225・TOPIX 将来リターン
- **簡易版**: C2/C3/C4の過去データが未整備のため、C1（日経225 vs 125日MA）+ C5（USDJPY 50日モメンタム）の2要素版で算出
- 各温度帯に `nikkei225` と `topix` の両方の統計を並列保存。`topix` は optional（未生成の古いビルドに備える）
- TOPIX は Yahoo Finance で指数シンボル（`^TPX` / `^TOPX`）が取得できないため、連動 ETF「NEXT FUNDS TOPIX連動型上場投信 (`1306.T`)」の日次終値を proxy として使用
- 生成スクリプト: `npm run generate:japan-stats`（`scripts/generate-japan-historical-stats.ts`）
- UI: `src/components/HistoricalStatsCard.tsx` の日本版カードに「日経平均 / TOPIX」切替タブ（`_trend/PeriodSwitcher` を再利用）。TOPIX 未生成時はタブを非表示
- アクセサ: `getHistoricalStats(market, indexKey?)` / `getStatsForScore(score, market, indexKey?)`。`indexKey` は `"nikkei225" | "topix"`。米国版では無視される

### クロス分析（参考値）
- `src/data/cross-historical-stats.json`: 温度計と対象市場を入れ替えた「参考値」の過去統計
  - `directions.usTempJpIdx`: 米国温度（VIX 推定）× 日経225（^N225）
  - `directions.jpTempUsIdx`: 日本温度（C1+C5 簡易 10年）× S&P500（^GSPC）
- 生成スクリプト: `npm run generate:cross-stats`（`scripts/generate-cross-historical-stats.ts`）
- アクセサ: `src/lib/cross-historical-stats.ts`（`getCrossHistoricalStats(direction)` / `getCrossStatsForScore(score, direction)` / `CROSS_DIRECTION_META`）。`direction` は `"usTempJpIdx" | "jpTempUsIdx"`
- UI: `src/components/CrossStatsCard.tsx`（1カードに方向タブ 🇺🇸×🇯🇵 / 🇯🇵×🇺🇸 を置いた単独配置。Dashboard では `StatsSection` の直後）
- **注意**: 温度と対象市場が異なるため、純粋分離の同市場統計より相関が弱い可能性あり。カード冒頭に参考値である旨の注釈を常時表示。日付結合は UTC 日付ベースの簡易結合で、厳密なイベントスタディではない

### 温度×セクター ヒートマップ（日本版）
- `src/data/japan-sector-heatmap.json`: 日本版温度スコア × TOPIX-17 連動 ETF 17本（NEXT FUNDS `1617.T`〜`1633.T`）の将来リターン（1M/3M/6M）を事前計算した静的 JSON
- **業種粒度**: 東証 33 業種ではなく **TOPIX-17 ベース**（食品 / エネルギー資源 / 建設・資材 / 素材・化学 / 医薬品 / 自動車・輸送機 / 鉄鋼・非鉄 / 機械 / 電機・精密 / 情報通信・サービスその他 / 電力・ガス / 運輸・物流 / 商社・卸売 / 小売 / 銀行 / 金融(除く銀行) / 不動産）。33 業種は ETF カバレッジ不足 + UI 過密で採用せず
- **スコア**: `japan-historical-stats.json` と同じ C1(日経225 vs 125日MA)+C5(USDJPY 50日モメンタム)の 2要素簡易版（整合性のため同ロジックを `scripts/generate-japan-sector-heatmap.ts` にコピー）
- 生成スクリプト: `npm run generate:sector-heatmap`（`scripts/generate-japan-sector-heatmap.ts`）。`aggregateLevelReturns` を各セクターで 1 回ずつ呼び出す実装（17 回）
- データ構造: sector-major（`sectors[].levels[]`）— 温度帯 TOP N セクター抽出が容易
- アクセサ: `src/lib/japan-sector-heatmap.ts`（`getJapanSectorHeatmap()` / `getSectorStatsForScore(score, sectorCode, period)` / `getTopSectorsForScore(score, period, limit=5)` — avgReturn 降順ランキング）
- UI: `src/components/SectorHeatmapCard.tsx` を Dashboard の `CrossStatsCard` 直後にフル幅配置。1M/3M/6M の `PeriodSwitcher`（デフォルト 3M）、現在温度帯 TOP3 ピル、17×5 ヒートマップ表（日本式配色: 正=red / 負=green を alpha で強度表現）、現在温度帯の列を ring-1 で強調、サンプル数 30 未満の温度帯は薄色（参考値）
- 既知の制約: TOPIX-17 連動 ETF を proxy として使用（指数本体は Yahoo Finance で取得不可）。極寒帯はサンプル数 111 日 × 各 ETF = 参考値として扱うこと

### 歴史的位置づけ表示（Score Percentile）
- `src/data/score-distribution.json`: 過去10年の温度スコア分布（市場別にソート済み配列）
  - `us.scores`: VIX 10年から `estimateFearGreedFromVix` で推定した温度スコア配列
  - `jp.scores`: 既存 `japan-temperature-history.json` の `daily[].score` を再利用
- 生成スクリプト: `npm run generate:score-distribution`（`scripts/generate-score-distribution.ts`）
- アクセサ: `src/lib/score-distribution.ts`（`getScorePercentile(score, market)` / `getDistributionMeta()`）。二分探索で O(log n) の percentile 計算。JSON 未生成時は `null` を返して UI 非表示
- UI: `src/components/HistoricalPercentileBadge.tsx` を `FearGreedGauge` のスコア直下に組み込み。下位 20% 以下は青系 + ❄️、上位 20% 以上は赤系 + 🔥、それ以外は灰色テキスト
- 生成順序の依存: `japan-temperature-history.json` を読み込むため `generate:japan-temperature-history` の後に実行する必要あり（CI workflow で順序固定）

### 自動更新
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし
- GitHub Actions（`.github/workflows/update-historical-stats.yml`）で毎月1日 JST 9:00に自動実行。米国版・温度推移・日本版・類似日データ・クロス分析・セクターヒートマップ・スコア分布の7種を同時生成。変更があればcommit→push→Vercel自動デプロイ。手動実行（workflow_dispatch）も可能

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

## 分析記事 `/analysis/[slug]`

独自データを掛け合わせた深掘り SEO 記事の置き場所。ペルソナ別の `/guide`、イベント別の `/events` とは別枠で、トピック×独自データのハイブリッド記事を貯める。収益化戦略上は「すでにメイン口座を持つ中級者」向けに信用取引サブ口座アフィなどの文脈適合 CTA を添える。

### 第2弾: VIX × S&P500 × 日経225（`/analysis/vix-threshold-sp500`）

「VIX 30 超え＝パニック＝危険」を過去20年で検証する記事。Primary は VIX バンド × {S&P500, 日経225} 1D、Bonus は VIX × 日本版温度 × 日経225 のクロス市場 2D。

**データ層**:
- `src/data/vix-sp500-analysis.json`: Yahoo Finance `^VIX` / `^GSPC` / `^N225` 日足 (過去20年、約5000取引日) + `japan-temperature-history.json` を結合して、(a) VIX バンド (`〜15 / 15〜20 / 20〜30 / 30〜`) 別の S&P500・日経225 前方リターン (1M/3M/6M)、(b) VIX × 日本版温度バンドの joint 2D（日経225 前方リターンベース、Primary が20年あるのに対し joint は temp 履歴オーバーラップの 2016-10〜 に限定）、(c) VIX の historical quantile (p25/p50/p75/p95) と最新値を格納。生成スクリプト: `npm run generate:vix-sp500`（`scripts/generate-vix-sp500-analysis.ts`）
- VIX と米国版株温計スコアは相関が強い（米国版スコアは VIX 由来）ため、joint の第2軸には**独立な**日本版温度を採用

**UI**:
- `src/app/analysis/vix-threshold-sp500/page.tsx`: Server Component。目次・用語解説・`VixSp500AnalysisBody` 埋め込み・示唆・手法・関連リンクで構成。JSON-LD 埋込、最新更新日明示
- `src/components/analysis/VixSp500AnalysisBody.tsx`: Client Component。`PeriodSwitcher<1m|3m|6m>` で期間切替、quartile 表・Primary 1D 表 (S&P500 + 日経225 横並び)・Joint 2D ヒートマップ (`heatmapCellStyle` 流用、`LOW_SAMPLE_THRESHOLD = 20`)。VIX が p75 以上 or 日本温度が極端時に上部アラート。`trackEvent("analysis_view", {slug:"vix-threshold-sp500"})`
- `src/components/analysis/InvestingBooksCTA.tsx`: Client Component。Amazon 書籍3冊（敗者のゲーム / ウォール街のランダム・ウォーカー / 賢明なる投資家）。**暫定仕様**: Amazon 商品ページ直リンク。Amazon アソシエイト登録後に associate tag 付き URL に差し替える。GA4 イベント `book_cta_click(article, book, placement)`
- `src/app/analysis/vix-threshold-sp500/opengraph-image.tsx`: 赤系グラデの静的 OG。VIX 最新値 / 中央値 / サンプル数を描画
- sitemap: `/analysis/vix-threshold-sp500` (`priority: 0.6`, `lastModified = vix-sp500-analysis.json.generatedAt`)
- CI: `update-historical-stats.yml` に `generate:vix-sp500` を追加（`generate:japan-temperature-history` の後）

### 第1弾: 信用倍率 × 株温計（`/analysis/margin-ratio-temperature`）

「信用倍率 4 倍超えは危険か」を過去10年データで検証する記事。

**データ層**:
- `src/data/margin-ratio-history.json`: JPX 公開の「信用取引現在高 過去推移表」（`margin/06.html` の連結 Excel `tvdivq0000015969.xls`）を取得して 2002-08 以降の週次信用倍率を `{date, buyBalance, sellBalance, ratio}[]` として保存。直近数週は `margin/04.html` の個別 `mtseisan*.xls` でギャップ埋めする。生成スクリプト: `npm run generate:margin-history`（`scripts/backfill-margin-ratio-history.ts`）
- `src/data/margin-ratio-analysis.json`: 上記履歴 × `japan-temperature-history.json` × Yahoo `^N225` を結合し、信用倍率バンド (`〜3倍 / 3〜4倍 / 4〜5倍 / 5倍〜`) × 温度バンド (`SENTIMENT_RANGES`) の 2D joint セルごとに 1ヶ月/3ヶ月/6ヶ月の日経225 前方リターンを集計したもの。加えて 1D マージナル・信用倍率 quartile・最新 context を格納。生成スクリプト: `npm run generate:margin-analysis`（`scripts/generate-margin-ratio-analysis.ts`）
- 結合は **申込日（金曜）基準**で anchor。温度スコアは申込日 or 7 日以内の直近営業日、base price は ^N225 の申込日 or 直近営業日終値。JPX 公表は T+5 営業日遅れだが 1ヶ月以上の horizon では影響小という注記を記事内に明記

**ヘルパ/共通資産**:
- `scripts/_lib/jpx-margin.ts`: 週次 Excel (`parseWeeklyMarginXls` / `extractWeeklyMarginLinks`) と連結履歴 Excel (`parseHistoryMarginXls` / `extractHistoryExcelUrl`) の両方に対応した JPX 信用取引残高パーサ。`excelSerialToIso` も提供
- `scripts/_lib/stats-aggregator.ts` に 2D 集計関数 `aggregateJointReturns<K>` を追加（1D の `aggregateLevelReturns` と並列）。`bucketOf: (date) => { band1, band2 } | null` を受けてセル配列を返す純粋関数。`scripts/__tests__/joint-aggregator.test.ts` でユニットテスト
- `src/lib/heatmap-colors.ts`: `heatmapCellStyle(avgReturn, maxAbs, isLowSample)` を SectorHeatmapCard から抽出して共有
- `src/lib/margin-ratio-analysis.ts`: 分析 JSON のアクセサ（`getMarginRatioAnalysis` / `findJointCell` / `classifyRatioToBand` / `computeRatioPercentile`）
- `src/lib/article-jsonld.ts`: `buildArticleJsonLd({url, headline, description, datePublished, dateModified, imageUrl?})` — 分析記事ページに埋め込む schema.org Article JSON-LD を純粋関数で組み立てる

**UI**:
- `src/app/analysis/page.tsx`: 記事インデックス（`StaticPageLayout` ベース、ハンド書きカード配列）
- `src/app/analysis/margin-ratio-temperature/page.tsx`: 記事本体（Server Component、`<Script type="application/ld+json">` で JSON-LD 埋め込み、目次・用語解説・`MarginRatioAnalysisBody` 埋め込み・示唆・手法・関連リンクで構成）
- `src/components/analysis/MarginRatioAnalysisBody.tsx`: Client Component。`PeriodSwitcher<1m|3m|6m>` で期間切替、quartile 表・2D ヒートマップ (`heatmapCellStyle` 流用、`LOW_SAMPLE_THRESHOLD = 10`)・1D マージナル表（信用倍率版 / 温度版）を描画。最新比率 ≥ 5 または温度 ≤ 20/≥81 のとき上部に動的 boost アラートカード。マウント時に GA4 `analysis_view` を送信
- `src/components/analysis/MarginAccountCTA.tsx`: Client Component。信用取引口座（松井/GMOクリック/SBI）の比較カード。**暫定仕様**: 各証券会社の公式サイトへ直リンク（`href` は top-level domain、`rel="noopener noreferrer"`）。PV が伸びたら ASP (A8 / もしも / バリューコマース / TCS / アクセストレード 等) 登録後にアフィリエイト URL へ差し替える前提。差し替え時に `rel` へ `sponsored nofollow` を加え、カード上部に「※PR / 広告」表示を復活させる。GA4 イベントは直リンク/アフィどちらでも共通の `broker_cta_click(article, broker, placement)` を使用してヒストリカル計測の継続性を確保
- `/analysis/margin-ratio-temperature/opengraph-image.tsx`: 静的 OG 画像。`buildNotoSansJpFonts` + `THERMOMETER_SVG` を `/api/og/daily` と共通利用。最新比率・中央値・サンプル数を描画
- `/terms` に第8条「広告・アフィリエイトリンクの表示」セクションを追加済み（景表法・JSTA ガイドライン対応）
- Footer / `/guide/short-term-trader` / `/guide/fire-long-term` から内部リンクを追加（トピッククラスタ形成）
- sitemap: `/analysis` (`priority: 0.7`) / `/analysis/margin-ratio-temperature` (`priority: 0.6`)。`lastModified` は `margin-ratio-analysis.json.generatedAt` 由来

**自動更新**: `.github/workflows/update-historical-stats.yml` の月次ジョブ末尾に `generate:margin-history` → `generate:margin-analysis` の 2 ステップを追加（`generate:japan-temperature-history` の後、順序重要）。生成ファイル 2 本を commit 対象に追加済み

## 温度連動バーチャルポートフォリオ（`/portfolio`）

株温計の温度スコアに応じて、日経225・S&P500 の株/現金配分を月次に切り替える「逆張り型」ポートフォリオのシミュレーション。過去約10年のバックテストとライブ追跡を公開し、リテンション（毎日 NAV が動く＝毎日見に来る動機）と SEO 資産化（「温度計 戦略 バックテスト」等のキーワード）を狙う。

**重要**: 金商法リスクを下げるため、徹頭徹尾「研究 / シミュレーション」として framing する（"今月◯買え" ではなく "ルールに基づけば理論上このようになっていた"）。`/terms` 第 9 条に「バックテスト・シミュレーション結果の表示について」を明記し、ページ冒頭には赤枠の常時免責バナーを置く。

### ルール（固定）
- 対象: 日本 = ^N225 + 現金（日本版温度 = C1+C5 で駆動）/ 米国 = ^GSPC + 現金（VIX→温度で駆動）
- リバランス: **月次**、各月第一営業日に温度帯を判定して目標配分へ移動
- 配分表（ニュートラル 60/40・振れ幅 ±30%）: 極寒=株90% / 冷え込み=75% / 平温=60% / 過熱=45% / 沸騰=30%
- 現金金利 / 手数料 / 税金 / スリッページ = すべて 0 固定（記事で明記）
- ベンチマーク: 100% 株の buy & hold（同じ銘柄）
- バックテスト期間: 2016-04-22（日本温度履歴の起点）〜 最新

### データ層
- `src/data/portfolio-history.json`: 日米 2 ポートフォリオの `daily[]` / `trades[]` / `stats` / `current` / `endState` / `cashYieldSensitivity` を同梱
- 生成（全再生成）: `npm run generate:portfolio-history`（`scripts/generate-portfolio-history.ts`）
- 差分 append: `npm run snapshot:portfolio`（`scripts/snapshot-portfolio.ts`）。既存 JSON の `endState` から継続。`cashYieldSensitivity` は spread で無変更保持（月次フル再生成で更新）
- 純粋関数: `scripts/_lib/portfolio-sim.ts`（`simulatePortfolio` / `DEFAULT_PORTFOLIO_RULE` / `computeStats` / `computeMaxDrawdown` / `computeSharpe`）
- ユニットテスト: `scripts/__tests__/portfolio-sim.test.ts`（リバランス発火 / NAV 保全 / 差分モード連続性）
- アクセサ: `src/lib/portfolio.ts`（`getPortfolioHistory` / `slicePortfolioDailyByDays` / `resolveBandByScore`、`PortfolioCashYieldScenario` 型）
- **現金金利感度分析**: 同じルールで `cashYield` を 0% / 1% / 3% に差し替えた 3 シナリオを `cashYieldSensitivity[]` に格納。記事の「現金金利シナリオの感度分析」セクションで一覧表示し、MMF/短期金利を仮定したときの相対改善を可視化（3% 想定で JP Sharpe 0.84 > ベンチ 0.71 に逆転する等）

### UI
- ページ本体: `src/app/portfolio/page.tsx`（Server Component、`StaticPageLayout` ベース、`buildArticleJsonLd` で Article JSON-LD 埋込、目次 + 赤枠免責バナー + ルール表 + `PortfolioBody` + 手法 + バイアス + 関連リンク）
- Client 本体: `src/components/portfolio/PortfolioBody.tsx`（日米タブ / 1Y・5Y・10Y 切替 / 現在配分カード / NAV 推移チャート（ComposedChart、ポートフォリオ = 温度色実線、ベンチマーク = グレー破線）/ 統計テーブル（totalReturn / CAGR / maxDD / Sharpe + ベンチ比）/ リバランス履歴（直近 12 件 + 展開）/ `InvestingBooksCTA placement="portfolio"`）
- Dashboard ミニカード: `src/components/PortfolioTeaserCard.tsx` を Dashboard 第 5 章「🔍 詳しく見る」末尾に配置。日米配分・α・最大DDを要約し `/portfolio?ref=dashboard_teaser` へ誘導。片方が極寒/沸騰時は amber 強調
- OG 画像: `src/app/portfolio/opengraph-image.tsx`（青系、日米 NAV・α・最大DD を並列表示、`buildNotoSansJpFonts` + `THERMOMETER_SVG` 共用）
- GA4 イベント: `portfolio_view` / `portfolio_market_switch` / `portfolio_period_switch` / `portfolio_teaser_click`

### SEO 配線
- sitemap: `/portfolio`（`priority: 0.8`, `changeFrequency: "daily"`, `lastModified = portfolio-history.json.generatedAt`）
- Footer 共通リンクに「温度連動ポートフォリオ」追加
- `/guide/fire-long-term` 末尾の関連リンクに `/portfolio` を追加（長期戦略読者ターゲット）
- `InvestingBooksCTA` は `placement: "portfolio"` と `article?: string`（既定 `"vix-threshold-sp500"`、`/portfolio` では `"portfolio"`）を受けるよう拡張済み

### 自動更新
- `.github/workflows/update-portfolio.yml`: 平日 JST 07:00（cron `0 22 * * 0-4`）に `snapshot:portfolio` を実行。差分があれば commit & push（コミットタイトル `chore(portfolio): daily NAV update YYYY-MM-DD`）
- `.github/workflows/update-historical-stats.yml`: 月次ジョブ末尾に `generate:portfolio-history` を追加（`generate:japan-temperature-history` の後）。差分 append で累積したズレを月 1 回リセット

### 既知の制約
- バックテスト期間は日本温度履歴に合わせて 2016-04-22 以降（約10年）。リーマンショックなどはカバーされない
- 現金金利 0% は保守的（MMF なら 1〜3% 上乗せ可）。手法セクションで明記
- 温度スコア自体（C1+C5 / VIX 推定）の過剰最適化リスクはあり得る。記事で明示

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
`scripts/_lib/stats-aggregator.ts` には日米の過去統計生成スクリプトで共通する温度帯別リターン集計関数 `aggregateLevelReturns<K>` に加え、分析記事用の 2D 集計関数 `aggregateJointReturns<K>` を提供。`scripts/__tests__/{stats-aggregator,joint-aggregator}.test.ts` でユニットテスト化。
`scripts/_lib/jpx-margin.ts` は JPX 信用取引残高 Excel を扱う共通パーサ（週次 `mtseisan*.xls` 用 `parseWeeklyMarginXls` / `extractWeeklyMarginLinks` と、連結履歴 `tvdivq0000015969.xls` 用 `parseHistoryMarginXls` / `extractHistoryExcelUrl` / `excelSerialToIso`）。`backfill-margin-ratio-history.ts` が利用する。

## 公開サイトとしての運用

### ページ構成
- `/` — メインダッシュボード（`src/app/page.tsx` → `Dashboard.tsx`）。データ取得と 15 分ポーリングは `src/components/dashboard/useMarketData.ts`、補助 UI は `src/components/dashboard/{LoadingView,ErrorView,DashboardHeader,DashboardFooter}.tsx` に分離。本体は **6 章構成** で、各章を `DashboardSection`（`src/components/dashboard/DashboardSection.tsx` — `<section aria-labelledby>` + `h2` 見出し + 説明文 + `space-y-6` 内部間隔を担う共通ラッパー）で包む：
  1. 🌡️ **今の温度** — `TemperatureSection` + `SimilarDaysSection`（「今日の温度 → 似た日 → その後のリターン」ナラティブを最速で完成させるペア配置）
  2. 📈 **温度の推移** — `TrendSection`
  3. 📊 **過去の傾向** — `StatsSection`
  4. 👤 **あなたへのヒント** — `PersonalizedHintCard`
  5. 🔍 **詳しく見る** — `CrossStatsCard` + `SectorHeatmapCard`（深掘り分析）
  6. 📉 **市場の生データ** — `JapanMarketSection` + `MarketDataSection`
  各子セクションコンポーネントは外側の `mb-X` を持たず、親 `DashboardSection` の `mb-10` + `space-y-6` で章間/章内のスペーシングを統一する
- `/about` — サイト説明（`src/app/about/page.tsx`）
- `/widget` — 埋め込みウィジェットの案内ページ（`src/app/widget/page.tsx`）。ライブプレビュー + コピー可能な embed HTML（`src/app/widget/_components/EmbedCodeBlock.tsx`）を表示。HTML 生成は純粋関数 `buildEmbedSnippet`（`src/app/widget/_lib/embed-snippet.ts`）に分離してユニットテスト対象化
- `/terms` — 利用規約 + 免責事項（`src/app/terms/page.tsx`）。金融情報サイトのため「投資助言ではない」旨を明記
- `/privacy` — プライバシーポリシー（`src/app/privacy/page.tsx`）
- `/events` — 主要イベント14件のインデックスページ（`src/app/events/page.tsx`）。日付降順でカード表示、各カードから詳細ページ `/events/[slug]?ref=events_index` へ遷移。`StaticPageLayout` ベース
- `/guide` — 投資家タイプ別ガイドのインデックスページ（`src/app/guide/page.tsx`）。`nisa-tsumitate` / `short-term-trader` / `fire-long-term` の 3 本をカード表示。各ガイドは単体 TSX（Markdown 化せず個別性重視）で `src/app/guide/[slug]/page.tsx`
- `/analysis` — 深掘り分析記事のインデックスページ（`src/app/analysis/page.tsx`）。第1弾は `/analysis/margin-ratio-temperature`（信用倍率 × 株温計）。詳細は上の「分析記事」セクション参照
- Dashboard 内の `StatsSection` 直後に `PersonalizedHintCard`（`src/components/PersonalizedHintCard.tsx`）を配置し、タブ切替で現在温度に応じた「あなたのスタイル別の読み方」を表示 → 該当ガイドへ遷移（`?ref=persona_hint`）。ヒント文言は純粋データ `src/lib/persona-hints.ts`（`PERSONA_HINTS` マトリクス / `getPersonaHint(persona, score)` / `isExtremeScore(score)`）。極寒/沸騰時はカード枠を amber 強調 + 注意書きを表示。選択したペルソナは localStorage（`kabuonkei.persona`）で保持し次回訪問時に復元。タブ切替は GA4 `persona_select` イベントを送信
- `/about` `/widget` `/terms` `/privacy` `/events` `/guide` の外枠（`<main>` + 戻るリンク + `<h1>` + コンテンツ枠）は `src/components/StaticPageLayout.tsx` に共通化されており、各 page は `<StaticPageLayout title="...">` で本文のみを記述する
- 全ページ共通フッター: `src/components/Footer.tsx`（`layout.tsx` で body 直下に配置、`mt-auto` で下端固定）。`/about` `/events` `/guide` `/analysis` `/widget` `/terms` `/privacy` へのリンクを掲載

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
- **robots / sitemap**: `src/app/robots.ts` / `src/app/sitemap.ts`。sitemap には `/`, `/about`, `/widget`, `/events`, `/guide` + 3 ガイド, `/analysis` + 分析記事, `/events/[slug]` 全件, `/terms`, `/privacy` を収録
- **記事 JSON-LD**: `src/lib/article-jsonld.ts` の `buildArticleJsonLd({url, headline, description, datePublished, dateModified, imageUrl?})` で schema.org Article 用 JSON 文字列を生成し、記事ページで `<Script type="application/ld+json">` として埋め込む（分析記事で利用）
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
