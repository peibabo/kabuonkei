# 温度推移データ

## 米国版
- `src/data/temperature-history.json`: 過去約11ヶ月分のVIX日次データから算出した米国版温度スコア（0-100）の時系列JSON
- 生成スクリプト: `npm run generate:temperature-history`（`scripts/generate-temperature-history.ts`）
- ランタイムの直近30日VIXチャートデータとマージして使用（ハイブリッド方式）
- GitHub Actionsで `historical-stats.json` と同時に自動更新

## 日本版

**`src/data/japan-temperature-history.json`** が日本版の唯一の時系列。市場温度（日経225 × 125 日移動平均乖離、定義は [temperature-score.md](./temperature-score.md)）の過去 10 年分。

- 生成: `npm run generate:japan-temperature-history`（`scripts/generate-japan-temperature-history.ts`、計算は `scripts/_lib/japan-temperature.ts`）。各要素は `{ date, score, nikkei }`
- 平日 JST 17 時台に `snapshot-japan-fg.yml` で全期間をフル再生成（価格だけから計算できるので過去分も同じ式で揃う）。月 1 回 `update-historical-stats.yml` でも再生成
- 使う場所: 推移チャート、前日比（`previousScoreBefore()`）、連続日数（`computeJapanLevelStreak()`）、ヒーローの sparkline、日本版アラート、過去 10 年中の位置（`score-distribution.json`）、ポートフォリオ、イベントページ、各分析
- 日付は日経225 の取引日。前日比と連続日数は「現在値の立会日」（`^N225` チャート末尾の日付）より前の記録と比べ、17 時以降や休場日に当日分を二重に数えない

**旧 5 要素版スナップショット（`src/data/japan-fg-snapshots.json`）**
- 2026-04-17〜11-16 に平日 17 時台に記録していた 5 要素版の日次スコア。2026-11-17 に記録を停止し、画面では使わない。値は書き換えずに記録として残す
- C2 / C3 の過去分補正（2026-09-30〜11-10、JPX のファイル形式変更による取得停止期間）は `npm run backfill:japan-fg`（`scripts/backfill-japan-fg-snapshots.ts`）で実施済み

**UI**: `src/components/JapanTemperatureTrendCard.tsx`（1M/3M/6M/1Y/5Y/10Y 切替）。市場温度 1 系列を温度色の線＋薄塗りで描き、Tooltip に市場温度と日経225 終値を出す。期間フィルタは `sliceByDays()`
- 温度帯バンド・凡例・期間ボタン・カードヘッダ・チャート軸 props・X軸日付フォーマッタ・期間定数は米国版（`TemperatureTrendCard.tsx`）と共通化され、`src/components/_trend/` 配下に集約（`constants.ts` / `TemperatureLegend.tsx` / `PeriodSwitcher.tsx` / `TrendCardHeader.tsx` / `axisProps.ts` / `renderTemperatureBands.tsx` / `formatXAxisDate.ts` / `periods.ts`）。`periods.ts` は `PeriodConfig<P>` 型と `US_TREND_PERIODS`（4期間）/ `JP_TREND_PERIODS`（6期間）を提供し、各カードが `days` / `labels` / `tickIntervals` を参照する。`axisProps.ts` は `XAxis`/`YAxis` の共通 props（0-100 目盛・灰色 tick・軸線なし）を定数化、`renderTemperatureBands.tsx` は `TEMPERATURE_BANDS` を `ReferenceArea` 群として描画する関数、`TrendCardHeader.tsx` はタイトル + `PeriodSwitcher` を並べるカード上部 UI を共通化する
