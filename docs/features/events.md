# イベント詳細ページ（`/events/[slug]`）

主要な市場イベント（コロナショック / Brexit / 令和のブラックマンデー 等）各日について、その日の日米温度スコアと前後±90日の温度推移、1M/3M/6M/1Y の実リターンを表示する恒久 URL。SEO 資産化（「令和のブラックマンデー 温度」等のクエリ獲得）と類似日カードからの回遊を兼ねる。

## データ
- `src/data/events-meta.json`: 14イベントのメタ（`slug` / `date` / `label` / `oneLiner` / `longDescription`）。`longDescription` は各イベントの「背景・市場心理・その後の示唆」を3段落で書いた Markdown 本文（1本あたり 500〜600字）で、SEO ロングテール流入を狙うための手書きテキスト
- `src/data/events-enriched.json`: 各イベントの 1M/3M/6M/1Y リターンを事前計算したもの。生成は `scripts/generate-similar-days.ts` が同時に出力する（Yahoo Finance から取得した N225 / S&P500 終値を使って `findPriceOnOrAfter` + `findForwardPrice` で計算）
- 古いイベント（2015-08-24 のチャイナショック等）もカバーするため、`YEARS_BACK = 11` で過去データを取得

## UI
- ページ本体: `src/app/events/[slug]/page.tsx`（Server Component。`generateStaticParams` で14件を SSG）。`longDescription` が存在するとき `react-markdown` で「当時の背景と市場心理」セクションを描画する（段落・強調・リンクのみ扱う軽量スタイリング）
- OG 画像: `src/app/events/[slug]/opengraph-image.tsx`（`generateStaticParams` でイベントごとに静的生成、動的ルート分の `●` SSG）
- チャート: `src/components/EventTrendChart.tsx`（`_trend/` の共通部品を再利用した Client Component）
- レンジ切出: `src/lib/japan-temperature-history.ts` の `sliceByDaysAround<T extends { date: string }>(points, centerDate, days)`（日米履歴で共用の汎用版）

## sitemap / 内部リンク
- `src/app/sitemap.ts` がイベント14件の URL を `priority: 0.5` / `changeFrequency: yearly` で追加。インデックスページ `/events` も `priority: 0.7` で追加
- `/events` インデックスページ（`src/app/events/page.tsx`）：14件を日付降順でカード表示し、各カードから `?ref=events_index` 付きで詳細へ遷移
- Dashboard の `SimilarDaysSection` 末尾に「過去の主要イベント一覧（14件）→」リンク（`?ref=similar_days_footer`）
- 全ページ共通 Footer に「主要イベント一覧」を追加
- About ページの「できること」リストからも `/events` にリンク
- 類似日カード（SimilarDaysCard）でイベントラベル付き行は `/events/[slug]?ref=event_link` リンクになる
- X bot（`scripts/post-daily-temperature-tweet.ts`）は TOP1 類似日がイベント付きのときツイート文末にイベントページ URL（`?utm_source=x&utm_campaign=event_link`）を追加する
