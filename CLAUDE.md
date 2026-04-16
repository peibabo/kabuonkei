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
- デプロイ先: Vercel

## 過去統計データ

- `src/data/historical-stats.json`: VIXベースの温度帯ごとに、日経225・S&P500の将来リターン（1ヶ月/3ヶ月/6ヶ月）を事前計算した静的JSON
- 生成スクリプト: `npm run generate:stats`（`scripts/generate-historical-stats.ts`）
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし

## 既知の制約

- **CNN Fear & Greed API**: サーバーサイドからのリクエストをbot検知(418)でブロックする。現在はVIXベースの簡易推定値でフォールバック中
- **日経VI (`^JNV`)**: Yahoo Financeにシンボルが存在しない。別データソース（JPX or J-Quants）が必要
- **yahoo-finance2 v3**: `new YahooFinance()` でインスタンス化が必要（v2の `import yahooFinance from ...` の直接利用は不可）
