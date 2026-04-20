- 日本語でやり取りをお願いします。
- git commitをする前に修正内容をもとに必要であればREADME及びCLAUDE.mdを修正してください。
- docs/配下のドキュメントに関する修正が行われた場合は、ドキュメントも更新してください。
- git commitをする前に必ず `npm run test:run` を実行し、全テストがパスすることを確認してください。テストが失敗した場合はコミットせず、修正してください。
- git commit, push, PR作成まで続けてやってください。
- 株温計（kabuonkei）は日本向けのサイトなので時間はJSTベースでお願いします。

## プロジェクト構成

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS
- **yahoo-finance2** (v3) でVIX・主要指数・為替・米国債利回りを取得
- **CNN Fear & Greed API** でセンチメントデータを取得
- **Recharts** でミニチャート描画
- **Vitest + Testing Library** でテスト
- APIキャッシュ: メモリキャッシュ（15分TTL）
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

温度計と統計対象市場を 1:1 で揃える方針（**米国版 = S&P500 / 日本版 = 日経225** の純粋分離）。クロス分析（米国温度×日本株など）は現状扱わない。

### 米国版
- `src/data/historical-stats.json`: VIXベースの温度帯ごとに、S&P500 の将来リターン（1ヶ月/3ヶ月/6ヶ月）を事前計算した静的JSON
- 生成スクリプト: `npm run generate:stats`（`scripts/generate-historical-stats.ts`）

### 日本版
- `src/data/japan-historical-stats.json`: 日本版温度帯ごとの日経225将来リターン
- **簡易版**: C2/C3/C4の過去データが未整備のため、C1（日経225 vs 125日MA）+ C5（USDJPY 50日モメンタム）の2要素版で算出
- 生成スクリプト: `npm run generate:japan-stats`（`scripts/generate-japan-historical-stats.ts`）

### 自動更新
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし
- GitHub Actions（`.github/workflows/update-historical-stats.yml`）で毎月1日 JST 9:00に自動実行。米国版・温度推移・日本版・類似日データの4種を同時生成。変更があればcommit→push→Vercel自動デプロイ。手動実行（workflow_dispatch）も可能

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
- 毎月1日 JST 9:00 に `update-historical-stats.yml` で自動再生成

**A: 本体5要素版の日次スナップショット（`src/data/japan-fg-snapshots.json`）**
- 現時点の5要素フルスコアを `computeJapanFearGreed()` で算出し、日次でJSONに追記
- 生成スクリプト: `npm run snapshot:japan-fg`（`scripts/snapshot-japan-fear-greed.ts`）
- 平日 JST 17:00（東証クローズ後）に `snapshot-japan-fg.yml` で自動実行
- 配列は日付昇順、同日エントリが既にあれば上書き

**UI**: `src/components/JapanTemperatureTrendCard.tsx`（1M/3M/6M/1Y/5Y/10Y 切替）。
Recharts の ComposedChart で 簡易版=破線/グレー、本体版=実線/オレンジ で重ねがけ。Tooltipで各要素スコアを表示。
- `src/lib/japan-temperature-history.ts` の `mergeJapanTemperatureData()` が2系列を統合し、`sliceByDays()` で期間フィルタ
- 温度帯バンド・凡例・期間ボタン・X軸日付フォーマッタ・期間定数は米国版（`TemperatureTrendCard.tsx`）と共通化され、`src/components/_trend/` 配下に集約（`constants.ts` / `TemperatureLegend.tsx` / `PeriodSwitcher.tsx` / `formatXAxisDate.ts` / `periods.ts`）。`periods.ts` は `PeriodConfig<P>` 型と `US_TREND_PERIODS`（4期間）/ `JP_TREND_PERIODS`（6期間）を提供し、各カードが `days` / `labels` / `tickIntervals` を参照する

## 今日の類似日（Similar Days）

今日の温度スコアに最も近かった過去日を TOP5 抽出し、その日からの 1ヶ月/3ヶ月/6ヶ月リターンを併せて表示するナラティブ機能。再訪動機とSNS拡散を狙う。

### データ
- `src/data/japan-similar-days.json`: 10年分の `{ date, score, return1m, return3m, return6m }` 配列（^N225ベース）
- `src/data/us-similar-days.json`: 同上（^GSPCベース）
- `src/data/market-events.json`: 主要経済イベントの日付→ラベル辞書（コロナショック底、Brexit、令和のブラックマンデー等）
- スコア基準は温度推移と同じ: 日本=C1(125日MA)+C5(50日USDJPYモメンタム)、米国=VIXベース推定
- 生成スクリプト: `npm run generate:similar-days`（`scripts/generate-similar-days.ts`）

### ライブラリ・UI
- アクセサ: `src/lib/similar-days.ts`（`getJapanSimilarDays` / `getUsSimilarDays` / `getMarketEvents` / `findSimilarDays`）
- UI: `src/components/SimilarDaysCard.tsx`（日本版/米国版共通、Dashboard で2列配置）
- 検索ロジック: `findSimilarDays(currentScore, history, events, topN)`
  - スコア差が小さい順。同率ならイベントラベル付きを優先、さらに同率なら新しい日付を優先
  - `return3m` が null のエントリ（最近すぎて未到達）は除外

## 日本市場データ

- `src/data/japan-market-data.json`: JPX公開データから取得した日本市場固有の需給データ
  - **投資主体別売買動向**: 海外投資家・個人・信託銀行・投資信託・事業法人の週次売買差引（億円）
  - **裁定残**: 裁定買い残・売り残の日次データ（百万株）
  - **信用倍率**: 信用買い残・売り残（億円）と信用倍率（= 買残/売残）の週次データ。JPX「信用取引現在高」ページから取得
- 生成スクリプト: `npm run generate:japan-market`（`scripts/generate-japan-market-data.ts`）
- データソース: JPXの統計ページからExcel/CSVをダウンロードしてパース
- **自動更新**: GitHub Actions（`.github/workflows/update-japan-market-data.yml`）で毎週金曜 JST 9:00に自動実行
- これらの週次・日次データは日本版温度スコア（C2/C3/C4）の入力にもなる
- 日本版温度の日次スナップショット（`snapshot:japan-fg`）もこのJSONを入力に使う

## コード構成（src/lib 配下）

責務ごとにファイルを分割している。主な役割と公開 API：

- `types.ts`: アプリ全体で使う型定義のみ
- `sentiment.ts`: 温度スコア → 温度帯 / 説明 / 色 への判定関数（`getSentimentLevel` / `getSentimentDescription` / `getSentimentColor`）
- `yahoo.ts`: yahoo-finance2 の薄いラッパー（`fetchQuote` / `fetchChart` / 共有インスタンス）
- `fear-greed.ts`: 米国版 Fear & Greed の取得（`fetchFearGreedIndex`）と VIX ベース推定（`estimateFearGreedFromVix`）
- `indices.ts`: VIX / 主要指数 / 米国10年債利回り / 為替 / コモディティの取得
- `market-data.ts`: ダッシュボード用エントリポイント `fetchAllMarketData()`（15分メモリキャッシュ）
- `japan-fear-greed/`: 日本版市場温度の計算（`thresholds.ts` / `utils.ts` / `normalize.ts` / `aggregate.ts` / `compute.ts` / `index.ts`）。外部からは `@/lib/japan-fear-greed` から import
- `historical-stats.ts`: 日米共通の過去統計 JSON アクセサ。`market: "us" | "jp"` を受け、`sp500` / `nikkei225` のデータを統一形状 `stats` に正規化して返す（`getHistoricalStats(market)` / `getStatsForScore(score, market)`）
- `temperature-history.ts` / `japan-temperature-history.ts`: 温度推移 JSON のアクセサと系列マージ
- `japan-market-data.ts`: 日本市場需給 JSON のアクセサ
- `similar-days.ts`: 類似日検索（`findSimilarDays` / 日本・米国のアクセサ / イベントラベル取得）
- `format.ts`: 共通フォーマッタ（`formatReturn` / `returnColorClass`）

`scripts/_lib/shared.ts` には生成スクリプト共通のヘルパー（`sleep` / `round1` / `median` / `findForwardPrice` / `buildPeriodStats` / `fetchDailyCloses` / `SENTIMENT_RANGES`）と、`src/lib` 側の `getSentimentLevel` / `estimateFearGreedFromVix` を re-export。
`scripts/_lib/snapshot-merge.ts` には日本版FGスナップショット追記の純粋関数（`mergeSnapshotEntry` / `emptySnapshotFile`）を分離し、`scripts/__tests__/snapshot-merge.test.ts` でユニットテスト化。

## 公開サイトとしての運用

### ページ構成
- `/` — メインダッシュボード（`src/app/page.tsx` → `Dashboard.tsx`）
- `/about` — サイト説明（`src/app/about/page.tsx`）
- `/terms` — 利用規約 + 免責事項（`src/app/terms/page.tsx`）。金融情報サイトのため「投資助言ではない」旨を明記
- `/privacy` — プライバシーポリシー（`src/app/privacy/page.tsx`）
- 全ページ共通フッター: `src/components/Footer.tsx`（`layout.tsx` で body 直下に配置、`mt-auto` で下端固定）

### SEO / 計測
- **metadata**: `src/app/layout.tsx` で title テンプレート / openGraph / twitter card / canonical / google-site-verification を定義。`metadataBase` は `NEXT_PUBLIC_SITE_URL` ベース
- **robots / sitemap**: `src/app/robots.ts` / `src/app/sitemap.ts`。sitemap は `/`, `/about`, `/terms`, `/privacy` の 4 ページ
- **GA4**: `src/components/GoogleAnalytics.tsx`。`NEXT_PUBLIC_GA_ID` 未設定なら何も出さない（開発時の安全策）
- **OG 画像**: `src/app/opengraph-image.tsx` で動的生成（`ImageResponse` + Google Fonts の Noto Sans JP サブセットを fetch）。手動の PNG 配置は不要

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
