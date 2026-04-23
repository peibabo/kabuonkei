# 過去統計データ

温度計と統計対象市場を 1:1 で揃える方針（**米国版 = S&P500 / 日本版 = 日経225** の純粋分離）がメイン。クロス分析（米国温度×日経225 / 日本温度×S&P500）は**参考値として別カード**で補助提示する。

## 米国版
- `src/data/historical-stats.json`: VIXベースの温度帯ごとに、S&P500 の将来リターン（1ヶ月/3ヶ月/6ヶ月）を事前計算した静的JSON
- 生成スクリプト: `npm run generate:stats`（`scripts/generate-historical-stats.ts`）

## 日本版
- `src/data/japan-historical-stats.json`: 日本版温度帯ごとの日経225・TOPIX 将来リターン
- **簡易版**: C2/C3/C4の過去データが未整備のため、C1（日経225 vs 125日MA）+ C5（USDJPY 50日モメンタム）の2要素版で算出
- 各温度帯に `nikkei225` と `topix` の両方の統計を並列保存。`topix` は optional（未生成の古いビルドに備える）
- TOPIX は Yahoo Finance で指数シンボル（`^TPX` / `^TOPX`）が取得できないため、連動 ETF「NEXT FUNDS TOPIX連動型上場投信 (`1306.T`)」の日次終値を proxy として使用
- 生成スクリプト: `npm run generate:japan-stats`（`scripts/generate-japan-historical-stats.ts`）
- UI: `src/components/HistoricalStatsCard.tsx` の日本版カードに「日経平均 / TOPIX」切替タブ（`_trend/PeriodSwitcher` を再利用）。TOPIX 未生成時はタブを非表示
- アクセサ: `getHistoricalStats(market, indexKey?)` / `getStatsForScore(score, market, indexKey?)`。`indexKey` は `"nikkei225" | "topix"`。米国版では無視される

## クロス分析（参考値）
- `src/data/cross-historical-stats.json`: 温度計と対象市場を入れ替えた「参考値」の過去統計
  - `directions.usTempJpIdx`: 米国温度（VIX 推定）× 日経225（^N225）
  - `directions.jpTempUsIdx`: 日本温度（C1+C5 簡易 10年）× S&P500（^GSPC）
- 生成スクリプト: `npm run generate:cross-stats`（`scripts/generate-cross-historical-stats.ts`）
- アクセサ: `src/lib/cross-historical-stats.ts`（`getCrossHistoricalStats(direction)` / `getCrossStatsForScore(score, direction)` / `CROSS_DIRECTION_META`）。`direction` は `"usTempJpIdx" | "jpTempUsIdx"`
- UI: `src/components/CrossStatsCard.tsx`（1カードに方向タブ 🇺🇸×🇯🇵 / 🇯🇵×🇺🇸 を置いた単独配置。Dashboard では `StatsSection` の直後）
- **注意**: 温度と対象市場が異なるため、純粋分離の同市場統計より相関が弱い可能性あり。カード冒頭に参考値である旨の注釈を常時表示。日付結合は UTC 日付ベースの簡易結合で、厳密なイベントスタディではない

## 温度×セクター ヒートマップ（日本版）
- `src/data/japan-sector-heatmap.json`: 日本版温度スコア × TOPIX-17 連動 ETF 17本（NEXT FUNDS `1617.T`〜`1633.T`）の将来リターン（1M/3M/6M）を事前計算した静的 JSON
- **業種粒度**: 東証 33 業種ではなく **TOPIX-17 ベース**（食品 / エネルギー資源 / 建設・資材 / 素材・化学 / 医薬品 / 自動車・輸送機 / 鉄鋼・非鉄 / 機械 / 電機・精密 / 情報通信・サービスその他 / 電力・ガス / 運輸・物流 / 商社・卸売 / 小売 / 銀行 / 金融(除く銀行) / 不動産）。33 業種は ETF カバレッジ不足 + UI 過密で採用せず
- **スコア**: `japan-historical-stats.json` と同じ C1(日経225 vs 125日MA)+C5(USDJPY 50日モメンタム)の 2要素簡易版（整合性のため同ロジックを `scripts/generate-japan-sector-heatmap.ts` にコピー）
- 生成スクリプト: `npm run generate:sector-heatmap`（`scripts/generate-japan-sector-heatmap.ts`）。`aggregateLevelReturns` を各セクターで 1 回ずつ呼び出す実装（17 回）
- データ構造: sector-major（`sectors[].levels[]`）— 温度帯 TOP N セクター抽出が容易
- アクセサ: `src/lib/japan-sector-heatmap.ts`（`getJapanSectorHeatmap()` / `getSectorStatsForScore(score, sectorCode, period)` / `getTopSectorsForScore(score, period, limit=5)` — avgReturn 降順ランキング）
- UI: `src/components/SectorHeatmapCard.tsx` を Dashboard の `CrossStatsCard` 直後にフル幅配置。1M/3M/6M の `PeriodSwitcher`（デフォルト 3M）、現在温度帯 TOP3 ピル、17×5 ヒートマップ表（日本式配色: 正=red / 負=green を alpha で強度表現）、現在温度帯の列を ring-1 で強調、サンプル数 30 未満の温度帯は薄色（参考値）
- 既知の制約: TOPIX-17 連動 ETF を proxy として使用（指数本体は Yahoo Finance で取得不可）。極寒帯はサンプル数 111 日 × 各 ETF = 参考値として扱うこと

## 歴史的位置づけ表示（Score Percentile）
- `src/data/score-distribution.json`: 過去10年の温度スコア分布（市場別にソート済み配列）
  - `us.scores`: VIX 10年から `estimateFearGreedFromVix` で推定した温度スコア配列
  - `jp.scores`: 既存 `japan-temperature-history.json` の `daily[].score` を再利用
- 生成スクリプト: `npm run generate:score-distribution`（`scripts/generate-score-distribution.ts`）
- アクセサ: `src/lib/score-distribution.ts`（`getScorePercentile(score, market)` / `getDistributionMeta()`）。二分探索で O(log n) の percentile 計算。JSON 未生成時は `null` を返して UI 非表示
- UI: `src/components/HistoricalPercentileBadge.tsx` を `FearGreedGauge` のスコア直下に組み込み。下位 20% 以下は青系 + ❄️、上位 20% 以上は赤系 + 🔥、それ以外は灰色テキスト
- 生成順序の依存: `japan-temperature-history.json` を読み込むため `generate:japan-temperature-history` の後に実行する必要あり（CI workflow で順序固定）

## 自動更新
- 月1回程度の更新で十分。ランタイムのAPIコスト増加なし
- GitHub Actions（`.github/workflows/update-historical-stats.yml`）で毎月1日 JST 9:00に自動実行。米国版・温度推移・日本版・類似日データ・クロス分析・セクターヒートマップ・スコア分布の7種を同時生成。変更があればcommit→push→Vercel自動デプロイ。手動実行（workflow_dispatch）も可能
