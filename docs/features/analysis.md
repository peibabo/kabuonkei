# 分析記事 `/analysis/[slug]`

独自データを掛け合わせた深掘り SEO 記事の置き場所。ペルソナ別の `/guide`、イベント別の `/events` とは別枠で、トピック×独自データのハイブリッド記事を貯める。収益化戦略上は「すでにメイン口座を持つ中級者」向けに信用取引サブ口座アフィなどの文脈適合 CTA を添える。

## 第6弾: 125日線乖離率（`/analysis/nikkei-ma-deviation`）

市場温度の元の値である「日経平均の 125 日移動平均乖離率」が、買い時・売り時のサインになるかを 1985 年以降の全営業日で検証する記事（2026-11-20 公開。「移動平均乖離率 買い時」系の検索と、市場温度の定義を C1 単独にしたことの説明を兼ねる）。フックは「+15% 以上に離れた後は 6ヶ月後に上がった回が多く、売り時ではなかった」「−15% 以下は日数で見ると良いが、回数で見ると普段並み」「−10〜−5% は前半と後半で結果が逆」。

**データ層**:
- `src/data/nikkei-ma-deviation-analysis.json`: Yahoo `^N225` 日足（1985-01〜）から生成。生成スクリプト: `npm run generate:nikkei-ma-deviation`（`scripts/generate-nikkei-ma-deviation-analysis.ts`）。月次の `update-historical-stats.yml` で再生成。JST 16 時より前の実行では当日の途中値を捨てる
- 集計の純粋関数: `scripts/_lib/nikkei-ma-deviation.ts` の `computeNikkeiMaDeviationAnalysis()`。乖離率は市場温度と同じく当日を含まない直前 125 営業日の平均と比べる（平均の計算は `scripts/_lib/japan-temperature.ts` の `computeTrailingMa125()` を市場温度の系列と共有。最新日の区切り・温度は丸める前の値で決めて `latest.bandKey` / `latest.temperature` に持つ）。区切り（`DEVIATION_BANDS`: −15%以下 / −15〜−10 / −10〜−5 / −5〜+5 / +5〜+10 / +10〜+15 / +15%以上）ごとに 21/63/126/252 営業日後のリターンを日数ベースで集計。時期の違いは、乖離率が取れる日数の中点（`halfSplitDate`、区切りの年を手で選ばない）で前半・後半に分けて集計。±15% を超えた日は前の該当日から 20 営業日以内なら同じ回にまとめ、回数ベース（`lowEpisodes` / `highEpisodes` / `episodeSummary`）も持つ
- 型とアクセサ: `src/lib/nikkei-ma-deviation-analysis.ts`（`classifyDeviation` / `deviationToTemperature` = トップのゲージと同じ式 / `findDeviationBand`）

**UI**:
- `src/app/analysis/nikkei-ma-deviation/page.tsx`: Server Component のみ。結論・乖離率と温度の対応表・検証のやり方・区切りごとの表・上側の回・下側の回（日数 vs 回数）・前半と後半・いまの乖離率・注意点。本文の言い回しはデータから決める（例: 前半と後半で「逆」と書くのは、どちらの時期も普段の日と 3 ポイント以上離れて上下が入れ替わる区切りだけ）
- `opengraph-image.tsx`: グレー系。+15% 以上の回の 6ヶ月後の上昇割合と、−15% 以下の「◯回中◯回」の対比
- `/analysis` 一覧・sitemap・`/feed.xml`・`related-reading.ts` に追加。`/learn/when-to-buy-stocks`・`/learn/what-is-fear-greed`・`/analysis/nikkei-crash-aftermath` の関連リンクから内部リンク

**テスト**: `scripts/__tests__/nikkei-ma-deviation.test.ts`（区切りの境界・温度への変換・直前 125 日の平均・回のまとめ方・前方リターンと未経過・前半後半の件数・生成済み JSON の整合）

## 第5弾: 日経平均の急落後（`/analysis/nikkei-crash-aftermath`）

「日経平均が1日5%以上下げた後どうなったか」を 1985 年以降の全件で検証する記事（2026-11-18 公開。11/06 の -6% 急落の直後で「暴落 その後」「底はいつ」系の検索需要を狙う）。フックは「急落した日に買うと 3ヶ月後の成績は良いが、急落した日が底だったのは 25 回中 4 回だけ → 分けて買う」。

**データ層**:
- `src/data/nikkei-crash-analysis.json`: Yahoo `^N225` 日足（1985-01〜）から生成。生成スクリプト: `npm run generate:nikkei-crash`（`scripts/generate-nikkei-crash-analysis.ts`）。月次の `update-historical-stats.yml` で再生成し、新しい急落は自動で一覧と集計に入る。JST 16 時より前の実行では当日の途中値を捨てる（月次ジョブは 9 時起動のため）
- 集計の純粋関数: `scripts/_lib/nikkei-crash.ts` の `computeNikkeiCrashAnalysis()`。前日比 -5% 以下を急落日とし、直前の急落から 20 営業日以内の急落は同じ回にまとめる（最初の日を買った日とする）。前方リターンは 21/63/126/252 営業日。その後の最大下落は 126 営業日以内の最安値まで（6ヶ月未経過の回は `isComplete: false` で底の集計から除く）。温度は `computeJapanTemperatureSeries()` で 1985 年までさかのぼって計算し、20 以下を「寒い」として比較
- 型とアクセサ: `src/lib/nikkei-crash-analysis.ts`（`getNikkeiCrashAnalysis` / `getLatestCrashEpisode` / `getFailedCrashEpisodes` = 6ヶ月後マイナスの回）

**UI**:
- `src/app/analysis/nikkei-crash-aftermath/page.tsx`: Server Component のみ（期間切替なし。表は 4 期間を横に並べる）。結論・検証のやり方・急落 vs 普段の日・底だったか・温度別・外れた例・全件一覧・注意点。本文の数字はすべて JSON から描画時に算出。GA4 の `analysis_view` は `src/components/analysis/AnalysisViewTracker.tsx`（Server Component の記事用の汎用部品）で送る
- `opengraph-image.tsx`: グレー系。3ヶ月後の平均と「◯回中◯回だけ底」の対比
- `/analysis` 一覧・sitemap・`/feed.xml`・`related-reading.ts`（銘柄ページの関連記事の巡回枠）に追加

**テスト**: `scripts/__tests__/nikkei-crash.test.ts`（閾値・まとめ方・前方リターン・未経過の扱い・温度の振り分け・生成済み JSON の整合）

## 第4弾: 温度帯×業種（`/analysis/sector-rotation-temperature`）

「暴落時はディフェンシブ銘柄」の通説を検証する記事。極寒帯の後 3 ヶ月で最も戻ったのは機械・電機・鉄鋼（景気敏感）で、ディフェンシブ（食品・医薬品・電力ガス）との差は約 8pp という逆説がフック。SEO は「暴落時 強い業種」「セクターローテーション」系クエリ狙い。

**データ層**:
- **新規 JSON なし**。`src/data/japan-sector-heatmap.json`（`/sectors` と同一、毎月1日自動再生成）をそのまま読む。本文の数値（TOP3 業種名・リターン・勝率・グループ平均）はページ描画時に動的算出するので、月次再生成で記事の数字も自動追従する
- `src/lib/sector-rotation.ts`: 温度帯起点の純粋関数群 — `getSectorRankingForLevel(level, period)`（全17業種の avgReturn 降順）/ `computeLevelAverages(period)`（帯別の全業種平均 = U字カーブ）/ `computeGroupAverage(codes, level, period)` + グループ定義 `DEFENSIVE_SECTOR_CODES`（食品/医薬品/電力ガス）・`CYCLICAL_SECTOR_CODES`（鉄鋼非鉄/機械/電機精密）

**UI**:
- `src/app/analysis/sector-rotation-temperature/page.tsx`: Server Component。結論先出し（動的数値）・目次・検証枠組み・`SectorRotationBody`・解釈（反発局面の対称性 / 沸騰は資源金融 / 電機は沸騰だけ12位）・注意点（極寒111日は V 字回復相場中心、重複サンプル等）・`InvestingBooksCTA`（`article="sector-rotation-temperature"`）・関連リンク
- `src/components/analysis/SectorRotationBody.tsx`: Client Component。`PeriodSwitcher<1m|3m|6m>`、①帯別全業種平均（バー付き）②極寒 vs 沸騰 TOP5/WORST3 対比 ③ディフェンシブ vs 景気敏感の帯別比較。`trackEvent("analysis_view", {slug})`
- `opengraph-image.tsx`: amber 系グラデ。極寒後3ヶ月 TOP3 vs ディフェンシブ平均の対比
- 内部リンク: `/sectors` と相互リンク（記事⇄基データ）。sitemap（`lastModified = japan-sector-heatmap.json.generatedAt`）と `/feed.xml` に追加。`/analysis` インデックスの `analysisIndexModified` にもヒートマップ generatedAt を含める

**テスト**:
- `src/__tests__/sector-rotation.test.ts`: ランキング降順 / 帯平均が min-max 範囲内 / グループコードの実在性
- `src/__tests__/sector-rotation-body.test.tsx`: 5温度帯・対比カード・期間切替・GA4 イベント

## 第3弾: 日米温度の乖離 × 将来リターン（`/analysis/temperature-divergence`）

「日本だけ熱い・米国は冷静」のような日米センチメント乖離局面のその後を、過去約 10 年で検証する記事。Primary は 乖離バンド × {S&P500, 日経225} の前方リターン + N225-S&P500 平均スプレッド、Joint は 乖離バンド × 日本版温度バンドの 2D。**温度差 = JP score - US score** と定義し、5 バンド (`≤ -20 / -20〜-10 / -10〜+10 / +10〜+20 / ≥ +20`) で集計する。

**データ層**:
- `src/data/divergence-analysis.json`: Yahoo Finance `^VIX` (米国版温度の元データ) / `^GSPC` / `^N225` 日足 (過去20年) と `japan-temperature-history.json` を結合。米国版温度は `estimateFearGreedFromVix()` (VIX 10 → 95、VIX 40 → 5 の線形マッピング) で再構成。日本版温度は市場温度（日経225 × 125日移動平均乖離、`japan-temperature-history.json` の範囲＝直近約10年。2026-11 時点で 2017-05-24〜）。集計対象は両指標が解決できる米国取引日 ≈ 2,300 日。生成スクリプト: `npm run generate:divergence`（`scripts/generate-divergence-analysis.ts`）
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
- `src/data/vix-sp500-analysis.json`: Yahoo Finance `^VIX` / `^GSPC` / `^N225` 日足 (過去20年、約5000取引日) + `japan-temperature-history.json` を結合して、(a) VIX バンド (`〜15 / 15〜20 / 20〜30 / 30〜`) 別の S&P500・日経225 前方リターン (1M/3M/6M)、(b) VIX × 日本版温度バンドの joint 2D（日経225 前方リターンベース、Primary が20年あるのに対し joint は temp 履歴オーバーラップの直近約10年（2026-11 時点で 2017-05-24〜）に限定）、(c) VIX の historical quantile (p25/p50/p75/p95) と最新値を格納。生成スクリプト: `npm run generate:vix-sp500`（`scripts/generate-vix-sp500-analysis.ts`）
- `episodes`（回数ベース、`scripts/_lib/vix-episodes.ts` の `computeVixEpisodes()`）: VIX 30 以上の日を、前の該当日から 20 営業日以内なら同じ 1 回にまとめ、最初の日に S&P500 を買った場合の 1M/3M/6M リターン、全取引日の baseline、最初の日が 180 日以内の最安値だった回数、回ごとの一覧を格納。Primary の「30〜」は日数ベースで長引いた危機（リーマン期など）の後半が多く数えられるため、併記して読み違いを防ぐ（note 第4弾で指摘）
- VIX と米国版株温計スコアは相関が強い（米国版スコアは VIX 由来）ため、joint の第2軸には**独立な**日本版温度を採用

**UI**:
- `src/app/analysis/vix-threshold-sp500/page.tsx`: Server Component。目次・用語解説・`VixSp500AnalysisBody` 埋め込み・示唆・手法・関連リンクで構成。JSON-LD 埋込、最新更新日明示
- `src/components/analysis/VixSp500AnalysisBody.tsx`: Client Component。`PeriodSwitcher<1m|3m|6m>` で期間切替、quartile 表・Primary 1D 表 (S&P500 + 日経225 横並び)・回数ベースの比較表と回ごとの一覧（`#episodes`、JSON に `episodes` がある場合のみ）・Joint 2D ヒートマップ (`heatmapCellStyle` 流用、`LOW_SAMPLE_THRESHOLD = 20`)。VIX が p75 以上 or 日本温度が極端時に上部アラート。`trackEvent("analysis_view", {slug:"vix-threshold-sp500"})`
- `src/components/analysis/InvestingBooksCTA.tsx`: Client Component。Amazon 書籍3冊（敗者のゲーム / ウォール街のランダム・ウォーカー / 賢明なる投資家）。**暫定仕様**: Amazon 商品ページ直リンク。Amazon アソシエイト登録後に associate tag 付き URL に差し替える。GA4 イベント `book_cta_click(article, book, placement)`
- `src/app/analysis/vix-threshold-sp500/opengraph-image.tsx`: 赤系グラデの静的 OG。VIX 最新値 / 中央値 / サンプル数を描画
- sitemap: `/analysis/vix-threshold-sp500` (`priority: 0.6`, `lastModified = vix-sp500-analysis.json.generatedAt`)
- CI: `update-historical-stats.yml` に `generate:vix-sp500` を追加（`generate:japan-temperature-history` の後）

## 第1弾: 信用倍率 × 株温計（`/analysis/margin-ratio-temperature`）

「信用倍率 4 倍超えは危険か」を過去10年データで検証する記事。

**データ層**:
- `src/data/margin-ratio-history.json`: JPX 公開の「信用取引現在高 過去推移表」（`margin/05.html` の連結 Excel。旧形式 `*_mtsk.xls` = 〜2026-09-18 申込分、新形式 `tvdivq*.xlsx` = 2026-09-25 申込分〜の 2 本を結合）を取得して 2002-08 以降の週次信用倍率を `{date, buyBalance, sellBalance, ratio}[]` として保存。直近数週は `margin/04.html` の個別週次ファイル（`*_mtcurrent.xlsx`）でギャップ埋めする。新形式は一般信用・制度信用別の列が増えて「合計」の列位置が変わったため、`parseHistoryMarginXls()` はヘッダの「合計 Total」から列を特定する。生成スクリプト: `npm run generate:margin-history`（`scripts/backfill-margin-ratio-history.ts`）
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
