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

## 過去統計データ

- `src/data/historical-stats.json`: VIXベースの温度帯ごとに、日経225・S&P500の将来リターン（1ヶ月/3ヶ月/6ヶ月）を事前計算した静的JSON
- 生成スクリプト: `npm run generate:stats`（`scripts/generate-historical-stats.ts`）
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし
- **自動更新**: GitHub Actions（`.github/workflows/update-historical-stats.yml`）で毎月1日 JST 9:00に自動実行。変更があればcommit→push→Vercel自動デプロイ。手動実行（workflow_dispatch）も可能

## 温度推移データ

- `src/data/temperature-history.json`: 過去約11ヶ月分のVIX日次データから算出した温度スコア（0-100）の時系列JSON
- 生成スクリプト: `npm run generate:temperature-history`（`scripts/generate-temperature-history.ts`）
- ランタイムの直近30日VIXチャートデータとマージして使用（ハイブリッド方式）
- GitHub Actionsで `historical-stats.json` と同時に自動更新

## 日本市場データ

- `src/data/japan-market-data.json`: JPX公開データから取得した日本市場固有の需給データ
  - **投資主体別売買動向**: 海外投資家・個人・信託銀行・投資信託・事業法人の週次売買差引（億円）
  - **裁定残**: 裁定買い残・売り残の日次データ（百万株）
  - **信用倍率**: 信用買い残・売り残（億円）と信用倍率（= 買残/売残）の週次データ。JPX「信用取引現在高」ページから取得
- 生成��クリプト: `npm run generate:japan-market`（`scripts/generate-japan-market-data.ts`）
- データソース: JPXの統計ページからExcel/CSVをダウンロードしてパース
- **自動更新**: GitHub Actions（`.github/workflows/update-japan-market-data.yml`）で毎週金曜 JST 9:00に自動実行

## 既知の制���

- **CNN Fear & Greed API**: サーバーサイドからのリクエストをbot検知(418)でブロックする。現在はVIXベースの簡易推定値でフォールバック中
- **日経VI (`^JNV`)**: Yahoo Financeにシンボルが存在しない。別データソース（JPX or J-Quants）が必要
- **yahoo-finance2 v3**: `new YahooFinance()` でインスタンス化が必要（v2の `import yahooFinance from ...` の直接利用は不可）
