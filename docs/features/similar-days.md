# 今日の類似日（Similar Days）

今日の温度スコアに最も近かった過去日を TOP5 抽出し、その日からの 1ヶ月/3ヶ月/6ヶ月リターンを併せて表示するナラティブ機能。再訪動機とSNS拡散を狙う。

## データ
- `src/data/japan-similar-days.json`: 11年分の `{ date, score, return1m, return3m, return6m }` 配列（^N225ベース）
- `src/data/us-similar-days.json`: 同上（^GSPCベース）
- `src/data/events-meta.json`: 主要経済イベントのメタ辞書。各エントリは `{ slug, date, label, oneLiner, longDescription? }`。`/events/[slug]` 詳細ページと類似日カードのイベントラベル表示の両方で使用。`longDescription` は Markdown 文字列（段落区切り `\n\n`、強調 `**...**`、リンク可）で、詳細ページで `react-markdown` により描画される SEO 本文
- `src/data/events-enriched.json`: 各イベント日から日経225 / S&P500 の 1M/3M/6M/1Y リターンを事前計算したもの。`scripts/generate-similar-days.ts` が同時出力する
- スコア基準は温度推移と同じ: 日本=C1(125日MA)+C5(50日USDJPYモメンタム)、米国=VIXベース推定
- 生成スクリプト: `npm run generate:similar-days`（`scripts/generate-similar-days.ts`）

## ライブラリ・UI
- アクセサ: `src/lib/similar-days.ts`（`getJapanSimilarDays` / `getUsSimilarDays` / `getMarketEvents` / `findSimilarDays`）。`getMarketEvents` は `src/lib/events.ts::getEventsAsDateMap()` の薄いラッパー（旧 `market-events.json` は `events-meta.json` に統合済み）
- イベント詳細ページ用アクセサ: `src/lib/events.ts`（`getEventsMeta` / `getEventBySlug` / `getEventsAsDateMap` / `getEnrichedEntry`）
- UI: `src/components/SimilarDaysCard.tsx`（日本版/米国版共通、Dashboard で2列配置）。イベントラベル付き行は `/events/[slug]?ref=event_link` へのリンクとして描画
- 検索ロジック: `findSimilarDays(currentScore, history, events, topN)`
  - スコア差が小さい順。同率ならイベントラベル付きを優先、さらに同率なら新しい日付を優先
  - `return3m` が null のエントリ（最近すぎて未到達）は除外
- イベント詳細ページとの紐付けは `src/components/dashboard/SimilarDaysSection.tsx` で `date → slug` マップを注入して行う
