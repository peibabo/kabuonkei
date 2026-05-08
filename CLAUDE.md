## 運用ルール

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
- **CNN Fear & Greed API** でセンチメントデータを取得（bot検知でブロック時は VIX ベース推定にフォールバック）
- **Recharts** でミニチャート描画
- **Vitest + Testing Library** でテスト
- APIキャッシュ: `/api/market` Route Handler の ISR（`revalidate = 900` 秒 = 15 分）
- デプロイ先: Vercel

## 温度スコア（要点）

- **米国版 Fear & Greed**: VIX ベース推定を主系列に採用（`src/lib/fear-greed.ts`）。S&P500 のセンチメントを示す
- **日本版 市場温度**: C1〜C5 の 5 要素等ウェイト平均（`src/lib/japan-fear-greed/`、エントリ `computeJapanFearGreed()`）。過去統計・推移は C1+C5 の 2 要素簡易版で算出
- UI: `src/components/FearGreedGauge.tsx`（日米共通、PC は 2 列）
- 詳細 → [docs/features/temperature-score.md](docs/features/temperature-score.md)

## 詳細ドキュメント

機能別の詳細はトピック別に `docs/` に分離している。該当テーマの編集時のみ Read する。

- [温度スコアの 2 本立て計算詳細](docs/features/temperature-score.md)
- [過去統計データ（米国 / 日本 / クロス / セクター / percentile）](docs/features/historical-stats.md)
- [温度推移データ（ハイブリッド方式 B+A）](docs/features/temperature-history.md)
- [今日の類似日（Similar Days）](docs/features/similar-days.md)
- [イベント詳細ページ `/events/[slug]`](docs/features/events.md)
- [分析記事 `/analysis/[slug]`（信用倍率・VIX）](docs/features/analysis.md)
- [温度連動バーチャルポートフォリオ `/portfolio`](docs/features/portfolio.md)
- [温度アラート（メール通知）](docs/features/alerts.md)
- [日本市場データ（JPX 需給）](docs/features/japan-market-data.md)
- [コード構成（src/lib / scripts/_lib の責務マップ）](docs/architecture.md)
- [公開サイト運用（ページ / ウィジェット / シェア UX / SEO / X Bot / 環境変数）](docs/operations.md)
  - SEO の構造化データ: Article / WebSite + Organization / BreadcrumbList / AboutPage + Person + ContactPoint。`events-meta.json` の `relatedSlugs?: string[]`（手動キュレーション、未指定なら日付近接で自動補完）/ `publishedAt?: string`（既定はサイトリリース日 2026-04-19）は任意フィールド
  - Atom フィード `/feed.xml` と用語集 `/glossary` あり。Footer から公開リンク済
  - 解説記事 `/learn/[slug]`（「○○とは？」クエリ対応）は `/glossary` × `/analysis` の中間レイヤー。公開済: `/learn/what-is-vix`、`/learn/what-is-fear-greed`、`/learn/what-is-margin-ratio`、`/learn/what-is-investor-flow`
- [プロジェクト仕様書（初期企画）](docs/spec.md)
- [デザインシステム（朝刊スタイル / 紙面トーン / カラー / タイポ）](DESIGN.md) — トップ画面 B 案以降の Source of Truth

## 既知の制約

- **CNN Fear & Greed API**: サーバーサイドからのリクエストを bot 検知 (418) でブロック。現在は VIX ベース推定値でフォールバック中
- **日経VI (`^JNV`)**: Yahoo Finance にシンボルが存在しない。別データソース（JPX or J-Quants）が必要
- **yahoo-finance2 v3**: `new YahooFinance()` でインスタンス化が必要（v2 の `import yahooFinance from ...` の直接利用は不可）
- **日本版過去統計の非対称性**: 本体の 5 要素スコアは C2/C3/C4 の過去データが未整備のため、過去統計は 2 要素簡易版で計算している
