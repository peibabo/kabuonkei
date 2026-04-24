# 分析記事 `/analysis/[slug]`

独自データを掛け合わせた深掘り SEO 記事の置き場所。ペルソナ別の `/guide`、イベント別の `/events` とは別枠で、トピック×独自データのハイブリッド記事を貯める。収益化戦略上は「すでにメイン口座を持つ中級者」向けに信用取引サブ口座アフィなどの文脈適合 CTA を添える。

## 第3弾: 日米温度の乖離 × 将来リターン（`/analysis/temperature-divergence`）

「日本だけ熱い・米国は冷静」のような日米センチメント乖離局面のその後を、過去約 10 年で検証する記事。Primary は 乖離バンド × {S&P500, 日経225} の前方リターン + N225-S&P500 平均スプレッド、Joint は 乖離バンド × 日本版温度バンドの 2D。**温度差 = JP score - US score** と定義し、5 バンド (`≤ -20 / -20〜-10 / -10〜+10 / +10〜+20 / ≥ +20`) で集計する。

**データ層**:
- `src/data/divergence-analysis.json`: Yahoo Finance `^VIX` (米国版温度の元データ) / `^GSPC` / `^N225` 日足 (過去20年) と `japan-temperature-history.json` を結合。米国版温度は `estimateFearGreedFromVix()` (VIX 10 → 95、VIX 40 → 5 の線形マッピング) で再構成。日本版温度は C1+C5 簡易版 (2016-10-28〜)。集計対象は両指標が解決できる米国取引日 ≈ 2,300 日。生成スクリプト: `npm run generate:divergence`（`scripts/generate-divergence-analysis.ts`）
- 集計時、JP score は同日 or 7 日以内の直近営業日で backward fill。Joint は `aggregateJointReturns` を再利用
- 温度差バンドは ±Infinity が JSON 化で `null` になる問題を避けるため sentinel 値 `±999` を使用

**アクセサ**:
- `src/lib/divergence-analysis.ts`: `getDivergenceAnalysis` / `classifyGapToBand` / `findDivergenceJointCell` / `computeGapPercentile`（5 区間線形補間）/ `describeGap`（乖離値→日本語ラベル）

**UI**:
- `src/app/analysis/temperature-divergence/page.tsx`: Server Component。目次・用語解説・`DivergenceAnalysisBody` 埋め込み・示唆・手法・関連リンクで構成。JSON-LD 埋込、最新更新日明示
- `src/components/analysis/DivergenceAnalysisBody.tsx`: Client Component。`PeriodSwitcher<1m|3m|6m>` で期間切替、quantile 表 (p10/p25/p50/p75/p90)・Primary 1D 表 (S&P500 + 日経225 + スプレッド)・Joint 2D ヒートマップ。乖離が p25 未満 or p75 超のとき上部に動的アラート (amber 系)
- `src/app/analysis/temperature-divergence/opengraph-image.tsx`: orange 系グラデの静的 OG。最新の日米温度・温度差・サンプル数を描画
- sitemap: `/analysis/temperature-divergence` (`priority: 0.6`, `lastModified = divergence-analysis.json.generatedAt`)
- CI: `update-historical-stats.yml` に `generate:divergence` を追加（`generate:vix-sp500` の後）

**テスト**:
- `src/__tests__/divergence-analysis.test.ts`: バンド境界 / quantile 補間 / セル検索 / 実 JSON の必須フィールド確認

## 第2弾: VIX × S&P500 × 日経225（`/analysis/vix-threshold-sp500`）

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

## 第1弾: 信用倍率 × 株温計（`/analysis/margin-ratio-temperature`）

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
