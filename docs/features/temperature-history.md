# 温度推移データ

## 米国版
- `src/data/temperature-history.json`: 過去約11ヶ月分のVIX日次データから算出した米国版温度スコア（0-100）の時系列JSON
- 生成スクリプト: `npm run generate:temperature-history`（`scripts/generate-temperature-history.ts`）
- ランタイムの直近30日VIXチャートデータとマージして使用（ハイブリッド方式）
- GitHub Actionsで `historical-stats.json` と同時に自動更新

## 日本版（ハイブリッド方式 B+A）

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
