# 銘柄別の株価の温度（`/stock` / `/stock/[code]` / `/ranking`）

検索流入の入口として、個別銘柄ごとの「株価の温度」ページを静的生成する。2026-11 時点の対象は**日経225採用銘柄**で、インデックス状況を見て TOPIX500 → 全銘柄へ広げる方針。

## 温度の定義

- 日本版温度の C1（終値 vs 125日移動平均の乖離）と同じ考え方を各銘柄に適用
- ただし C1 の固定閾値（±15%）を個別株に使うと 0/100 に張り付く日が多い（2026-11 検証: 直近1年で 23〜60%）ため、**乖離 ÷ その銘柄の直近250営業日の乖離の振れ幅（二乗平均平方根）= z 値**にし、±2σ を 0〜100 に割り当てる（`mapToScore` を再利用）。張り付きは 1〜13% に低下
- σ は各日時点の過去データだけで計算（先読みなし）。出力は直近1年分
- 実装: `src/lib/stock-temperature/score.ts` の `computeStockTemperatureSeries`

## データ

- 対象銘柄: `src/data/nikkei225-constituents.json`（**コードのみ手動管理**。日経の構成銘柄ファイルは日経の著作物のため、ウエート・業種等は保存しない。4月・10月の定期入替や臨時入替で更新）
- 銘柄名・東証33業種: JPX「東証上場銘柄一覧」(`data_j.xlsx`) から毎回取得（`scripts/_lib/jpx-listed.ts`）
- 終値: Yahoo Finance から約3.3年分を取得（`fetchDailyCloses`）
- 出力: `src/data/stock-temperatures.json`（`{ generatedAt, asOf, universe, stocks: { [code]: { name, sector, history: [[date, score], ...] } } }`、1行 JSON）
- **終値などの生の価格は保存・公開しない**（独自指標特化方針）
- 生成: `npm run generate:stock-temperatures`（`-- --codes=7203,9984` で対象を絞れる）。取得成功率 90% 未満なら書き出さずに異常終了
- 自動更新: `.github/workflows/update-stock-temperatures.yml`（平日 16:30 JST）→ コミット → Vercel 自動デプロイ
- 毎回全履歴を再計算するため、履歴の蓄積は不要

## ページ

- `/stock/[code]`（`src/app/stock/[code]/page.tsx`、SSG・`dynamicParams = false`）: 現在の温度と温度帯、前日・1週間前・1か月前比、日経225内・業種内の順位、直近90日の推移（サーバー描画 SVG `src/components/stock/TemperatureChartSvg.tsx`）と最高/最低/平均、過去1年の温度帯別日数と「上位 X% の熱さ」、直近30営業日の表、同業種で温度が高い5銘柄、解説、更新日時と免責
- `/stock`: 東証33業種別の一覧
- `/ranking`: 温度の高い/低い TOP50、前日比の上昇/下落 TOP20
- HTML サイズ: 一覧系は行数が多いため `StockScoreList` で素の `<a>`・table 側の一括クラス・温度色のクラス化で軽量化（2026-11 時点で /stock 約183KB、/ranking 約153KB、各銘柄ページ約70KB、いずれも非圧縮）
- 集計ロジック: `src/lib/stock-temperature/stats.ts`（純関数・テストあり）、読み込み: `src/lib/stock-temperature/index.ts`
- SEO: タイトル `{銘柄名}（{コード}）の株価の温度｜株温計`、動的 description、canonical、OGP（サイト共通画像）、Dataset + BreadcrumbList JSON-LD。sitemap に全件収録
