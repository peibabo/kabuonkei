# 公開サイトとしての運用

## ページ構成
- `/` — メインダッシュボード（`src/app/page.tsx` → `Dashboard.tsx`）。データ取得と 15 分ポーリングは `src/components/dashboard/useMarketData.ts`、補助 UI は `src/components/dashboard/{LoadingView,ErrorView,DashboardHeader,DashboardFooter}.tsx` に分離。本体は **朝刊ヒーロー + 6 章構成**（B 案：2026-04-25 〜）：
  - **🌡 ヘッダー** — `DashboardHeader`（タイトル + 紙面風「日付 + 第N号」帯 + アラート/About 導線）
  - **📰 ヒーロー（章外）** — `HeadlineHero`
    - `src/components/hero/HeadlineHero.tsx`: 純粋関数 `src/lib/headline.ts`（決定木 v1）が日米スコア + 昨日比から「今日の見出し」一行コピー + サブテキスト + CTA 2 つを生成。罫線囲みの紙面風レイアウト（`font-serif-jp` Noto Serif JP 800）
  - **🌡 今の温度** — `TemperatureSection`（半円ゲージ × 2＝サービスの肝） + `TemperatureTiles`（補足 2 タイル: 日米平均 / 昨日比、独自 SVG `src/components/hero/Sparkline.tsx` で直近推移）
  - **🔁 今日の類似日** — `SimilarDaysSection`
  - **📈 温度の推移** — `TrendSection`（`JapanTemperatureTrendCard` + `TemperatureTrendCard`）
  - **📊 過去の傾向** — `StatsSection`
  - **👤 あなたへのヒント** — `PersonalizedHintCard`
  - **🔍 詳しく見る** — `CrossStatsCard` + `SectorHeatmapCard` + `PortfolioTeaserCard`
  - **📉 市場の生データ** — `JapanMarketSection` + `MarketDataSection`
  各子セクションコンポーネントは外側の `mb-X` を持たず、親 `DashboardSection` の `mb-10` + `space-y-6` で章間/章内のスペーシングを統一する。号数は `src/lib/issue-number.ts` がリリース日 `2026-04-19` を第 1 号として JST カレンダー日数で算出
- `/about` — サイト説明（`src/app/about/page.tsx`）
- `/widget` — 埋め込みウィジェットの案内ページ（`src/app/widget/page.tsx`）。ライブプレビュー + コピー可能な embed HTML（`src/app/widget/_components/EmbedCodeBlock.tsx`）を表示。HTML 生成は純粋関数 `buildEmbedSnippet`（`src/app/widget/_lib/embed-snippet.ts`）に分離してユニットテスト対象化
- `/terms` — 利用規約 + 免責事項（`src/app/terms/page.tsx`）。金融情報サイトのため「投資助言ではない」旨を明記
- `/privacy` — プライバシーポリシー（`src/app/privacy/page.tsx`）
- `/events` — 主要イベント14件のインデックスページ（`src/app/events/page.tsx`）。日付降順でカード表示、各カードから詳細ページ `/events/[slug]?ref=events_index` へ遷移。`StaticPageLayout` ベース
- `/guide` — 投資家タイプ別ガイドのインデックスページ（`src/app/guide/page.tsx`）。`nisa-tsumitate` / `short-term-trader` / `fire-long-term` の 3 本をカード表示。各ガイドは単体 TSX（Markdown 化せず個別性重視）で `src/app/guide/[slug]/page.tsx`
- `/analysis` — 深掘り分析記事のインデックスページ（`src/app/analysis/page.tsx`）。第1弾は `/analysis/margin-ratio-temperature`（信用倍率 × 株温計）。詳細は [分析記事ドキュメント](features/analysis.md) 参照
- Dashboard 内の `StatsSection` 直後に `PersonalizedHintCard`（`src/components/PersonalizedHintCard.tsx`）を配置し、タブ切替で現在温度に応じた「あなたのスタイル別の読み方」を表示 → 該当ガイドへ遷移（`?ref=persona_hint`）。ヒント文言は純粋データ `src/lib/persona-hints.ts`（`PERSONA_HINTS` マトリクス / `getPersonaHint(persona, score)` / `isExtremeScore(score)`）。極寒/沸騰時はカード枠を amber 強調 + 注意書きを表示。選択したペルソナは localStorage（`kabuonkei.persona`）で保持し次回訪問時に復元。タブ切替は GA4 `persona_select` イベントを送信
- `/about` `/widget` `/terms` `/privacy` `/events` `/guide` の外枠（`<main>` + 戻るリンク + `<h1>` + コンテンツ枠）は `src/components/StaticPageLayout.tsx` に共通化されており、各 page は `<StaticPageLayout title="...">` で本文のみを記述する
- 全ページ共通フッター: `src/components/Footer.tsx`（`layout.tsx` で body 直下に配置、`mt-auto` で下端固定）。`/about` `/events` `/guide` `/analysis` `/widget` `/terms` `/privacy` へのリンクを掲載

## 埋め込みウィジェット画像 API
- `/widget/today` — 400×400 PNG を動的生成する Route Handler（`src/app/widget/today/route.tsx`）。他サイトが `<img src>` で貼れる SEO 資産（被リンク獲得目的）。内部で `fetchAllMarketData()` を呼び、日米の最新スコアを描画
- `export const revalidate = 900` の ISR に加え、`Cache-Control: public, s-maxage=900, stale-while-revalidate=3600` を付与して CDN/ブラウザで多層キャッシュ。大量アクセスでもオリジン到達は最小
- レイアウトは `src/app/widget/today/_components/MiniScoreCard.tsx`（横長カード）を JP / US の 2 段で配置。定数（サイズ・フォントサブセット文字集合）は `src/app/widget/today/_constants.ts`
- フォント取得は `buildNotoSansJpFonts`、ロゴ SVG は `THERMOMETER_SVG` を `/api/og/daily` と共有
- embed HTML のリンクには `?ref=widget` が付与され、GA4 で埋め込み経由流入をセグメント計測可能

## シェア UX（温度カード右上）
- `FearGreedGauge` のタイトル行右上に **📤 共有ボタン**（`src/components/share/ShareButton.tsx`）を配置。日米それぞれから開ける
- クリックで **シェアシート**（`src/components/share/ShareSheet.tsx`）を `createPortal` で body 直下に展開。PC は中央モーダル、モバイルはボトムドロワー（単一 Client Component で Tailwind `md:` ブレークポイントにより位置・形状切替）
- シート内容: `/widget/today` プレビュー画像 + 4 つのアクション（🐦 Xで共有 / 🖼 画像を保存 / 🔗 URLをコピー / 📝 ブログに貼る）+ 埋め込みコード展開 + `/widget` への詳細リンク
- X 共有文言は `buildShareText`（`src/lib/share-text.ts`）が純粋関数で生成。極端温度時は「⚠️ 極寒アラート」「🔥 沸騰アラート」のヘッダーに変化。クリックした市場（JP/US）の行を先頭に並べ、両スコアを含める
- embed HTML は既存の `buildEmbedSnippet`（`src/app/widget/_lib/embed-snippet.ts`）を流用
- a11y: `role="dialog"` + `aria-modal` + focus trap（Tab 循環）+ ESC / オーバーレイクリックで close + `body overflow:hidden` で scroll lock
- GA4 イベント: `share_sheet_open`（シート開いた）と `share`（`method: twitter|url_copy|image_download|embed_copy` + `market: jp|us`）を `src/lib/analytics.ts` の `trackEvent()` 経由で送信
- 共有 URL には `?ref=share&utm_source=x&utm_campaign=share_card` を付与して流入計測

## SEO / 計測
- **metadata**: `src/app/layout.tsx` で title テンプレート / openGraph / twitter card / canonical / google-site-verification を定義。`metadataBase` は `NEXT_PUBLIC_SITE_URL` ベース
- **robots / sitemap**: `src/app/robots.ts` / `src/app/sitemap.ts`。sitemap には `/`, `/about`, `/glossary`, `/widget`, `/events`, `/guide` + 3 ガイド, `/analysis` + 分析記事, `/events/[slug]` 全件, `/terms`, `/privacy` を収録
- **記事 JSON-LD**: `src/lib/article-jsonld.ts` の `buildArticleJsonLd({url, headline, description, datePublished, dateModified, imageUrl?})` で schema.org Article 用 JSON 文字列を生成し、記事ページで `<Script type="application/ld+json">` として埋め込む（分析記事で利用）
- **WebSite + Organization JSON-LD**: `src/lib/website-jsonld.ts` の `buildWebSiteJsonLd()` を `src/app/layout.tsx` でグローバルに埋め込む。サイト名・運営組織（リブラボ）・ロゴを通知し、Google サイトリンク検索ボックス候補に乗せる
- **BreadcrumbList JSON-LD + UI パンくず**: `src/lib/breadcrumb-jsonld.ts` の `buildBreadcrumbJsonLd(items)` と `src/components/Breadcrumb.tsx` を併用。`/events/[slug]`, `/portfolio`, `/analysis/*` で SERP のパンくず表示候補に乗せる
- **manifest**: `src/app/manifest.ts`（Next.js が `/manifest.webmanifest` を自動配信）。PWA 対応とブランド情報の補強。アイコンは既存の `src/app/icon.svg` / `apple-icon.png` を流用
- **GA4**: `src/components/GoogleAnalytics.tsx`。`NEXT_PUBLIC_GA_ID` 未設定なら何も出さない（開発時の安全策）
- **OG 画像**: `src/app/opengraph-image.tsx` で動的生成（`ImageResponse` + Google Fonts の Noto Sans JP サブセットを fetch）。手動の PNG 配置は不要。フォント取得（`loadGoogleFont` / `buildNotoSansJpFonts`）と温度計アイコン SVG は `src/lib/og/{fonts,thermometer-svg}.ts` に共通化されており、`/api/og/daily` 側も同じモジュールを参照する
- **イベント詳細の関連リンク・公開日**: `src/lib/events.ts` の `getRelatedEvents(slug, limit)` で関連イベントを最大 3 件取得（手動キュレーション `relatedSlugs` 優先、未指定なら日付近接で自動補完）。`getEventPublishedAt()` でページ公開日を解決し、`<time dateTime>` で表示。既定値は `EVENTS_DEFAULT_PUBLISHED_AT` (= サイトリリース日 2026-04-19)
- **Atom フィード `/feed.xml`**: `src/app/feed.xml/route.ts`（`src/lib/feed.ts` の `buildAtomFeed()`）。3 分析記事 + portfolio + 14 主要イベントを `updated` 降順で配信。Cache-Control は `s-maxage=3600, stale-while-revalidate=86400`。layout の `metadata.alternates.types["application/atom+xml"]` で `<link rel="alternate">` を出し、Footer にも公開リンクを掲載
- **用語集 `/glossary`**: `src/app/glossary/page.tsx`。VIX / 日経VI / Fear & Greed / 信用倍率 / 裁定残 / 投資主体別売買動向 / 市場温度スコア / DCA / 最大DD / NISA / 類似日 等 12 用語を 1 語 400〜600 字で定義し、各用語に「株温計での扱い」リンクを併記して内部リンクのハブとして機能させる
- **解説記事 `/learn/[slug]`**: `src/app/learn/page.tsx` (index) + 各記事ディレクトリ。「○○とは？」のようなクエリに正面から答える 3,000 字級の腰を据えた解説。公開済は `/learn/what-is-vix`（VIX）/ `/learn/what-is-fear-greed`（CNN Fear & Greed Index と株温計の日本版設計）/ `/learn/what-is-margin-ratio`（信用倍率、株温計 C4 要素）/ `/learn/what-is-investor-flow`（投資部門別売買動向、株温計 C3 要素）/ `/learn/what-is-arbitrage-balance`（裁定残、株温計 C2 要素）/ `/learn/what-is-drawdown`（ドローダウン、`/portfolio` の DD 抑制検証と接続）/ `/learn/what-is-advance-decline-ratio`（騰落レシオ、市場の幅・過熱感指標。独自バックテストは持たず一般通説＋温度スコアとの質的接続で解説）/ `/learn/what-is-nikkei-vi`（日経VI、VIX との違いとデータ取得制約。独自時系列は持たず一般通説＋温度スコア設計の説明で解説）。Article JSON-LD + Breadcrumb + 動的 OG 画像を完備。`/glossary` の各エントリと `/analysis` 検証記事へ相互リンクし、解説 → 用語 → データ検証 という 3 層導線を作る
- **About ページ JSON-LD**: `src/app/about/page.tsx` で AboutPage + Person + ContactPoint + Organization 参照のグラフを埋め込み。`buildArticleJsonLd` の `author.url` も `/about` に向けて運営者プロフィールに繋がるよう統一

## 環境変数
- `NEXT_PUBLIC_SITE_URL` — canonical / OGP / sitemap のベース URL
- `NEXT_PUBLIC_GA_ID` — Google Analytics 4 の測定 ID
- `GOOGLE_SITE_VERIFICATION` — Google Search Console サイト所有権確認コード
- `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` — X（Twitter）Bot 投稿用（OAuth 1.0a User Context、Read and Write 権限）
- `RESEND_API_KEY` — Resend の送信 API Key（温度アラートメール）
- `RESEND_FROM_EMAIL` — 送信元アドレス（初期は `onboarding@resend.dev`、独自ドメイン検証後に `alerts@kabuonkei.com` へ）
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` — Upstash Redis REST（Vercel Marketplace の Upstash for Redis 統合で自動注入。GitHub Actions 側は Secrets に同名で手動コピー）
- `ALERTS_TOKEN_SECRET` — 確認/配信解除トークンの HMAC 秘密鍵（32 バイト以上、`openssl rand -hex 32`）
- `ALERTS_ALLOWED_ORIGINS` — `/api/alerts/subscribe` の Origin ホワイトリスト（カンマ区切り、任意）

## X（Twitter）Bot — 朝の寄り前ブリーフィング
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

## 温度アラート（メール通知）

- **目的**: 極端温度（米国/日本 F&G `≤20` or `≥80`）発生時にメールで通知 → 再訪動機 + メール資産
- **発火ロジック**: 状態遷移ベース + ±5pt ヒステリシス。連続発火なし。`neutral→cold/hot` および `cold↔hot` 直接反転のみ発火
- **発火時刻**: 平日 JST 07:00（米国版、X Bot の直前）/ 17:15（日本版、snapshot-japan-fg の直後）
- **登録フロー**: Double opt-in（確認メール 24h、HMAC トークン）/ ワンクリック解除（恒久トークン、`List-Unsubscribe` ヘッダ対応）
- **永続化**: Upstash Redis（Vercel Marketplace の Upstash for Redis 統合、Free プラン 500k commands/月）。キー命名は `alerts:*` プレフィックス
- **送信**: Resend REST API（初期は無料プラン 3,000 通/月、`onboarding@resend.dev` サンドボックス）
- **発火スクリプト**: `scripts/check-temperature-alerts.ts`（`npm run alerts:check -- --variant us|jp [--dry-run]`）
- **自動実行**: `.github/workflows/check-temperature-alerts.yml`（cron `0 22 * * 0-4` + `15 8 * * 1-5`、workflow_dispatch で手動変種実行も可）
- **必要な GitHub Secrets**: `RESEND_API_KEY` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` / `ALERTS_TOKEN_SECRET`（Repository Variable に `RESEND_FROM_EMAIL` も）
- 詳細: [features/alerts.md](features/alerts.md)
