# 🌡 株温計（かぶおんけい）

「今日の相場、熱い？冷たい？」― 市場の温度を測る日本語版 Fear & Greed ダッシュボード

## 概要

市場のセンチメント（恐怖・欲望）を示す複数の指標を **1画面で俯瞰できる** 日本語Webサービスです。

### 掲載指標

- **Fear & Greed（米国）** - CNN Fear & Greed Indexベースのメインゲージ（0-100）
- **市場温度（日本）** - 日本市場独自の5要素バランス型温度スコア
  - 日経225モメンタム（125日MA乖離）/ 海外投資家フロー（直近4週累積）/ 信用倍率 / 裁定残バランス / ドル円50日モメンタム
- **温度の推移チャート（米国版）** - 過去1年分の温度推移を時系列で可視化（期間切り替え対応）
- **温度の推移チャート（日本版）** - 過去10年分の簡易版スコア（C1+C5 2要素）+ 日次記録の5要素フルスコアを2系列で重ね表示（1M/3M/6M/1Y/5Y/10Y 切替）
- **過去の統計（米国版）** - 米国版温度帯別の S&P500 将来リターン統計
- **過去の統計（日本版）** - 日本版温度帯別の日経225将来リターン統計
  - 温度計と統計対象市場を 1:1 で揃える純粋分離（米国=S&P500 / 日本=日経225）
- **今日の類似日** - 今日の温度に最も近かった過去日 TOP5 と、その日からの1M/3M/6M将来リターンをナラティブで表示
  - 主要経済イベント（コロナショック底、Brexit、令和のブラックマンデー等）はラベル付き
- **イベント詳細ページ（`/events/[slug]`）** - 14件の主要市場イベントについて、その日の日米温度・前後±90日の温度推移・1M/3M/6M/1Y 実リターンに加え、各イベントごとの「当時の背景と市場心理」解説（Markdown 本文、1本 500〜600字）を表示する恒久 URL（全件 SSG、イベント別 OG 画像付き）
- **主要イベント一覧（`/events`）** - 14件を日付降順で俯瞰できるインデックスページ。Footer・About・類似日カード末尾から導線あり
- **日本市場の需給** - 投資主体別売買動向（海外投資家等の買越/売越）+ 裁定残推移 + 信用倍率
- **埋め込みウィジェット** - `/widget/today` で配信する 400×400 PNG 画像。他サイト（ブログ/note/X）に貼り付けると今日の日米温度を自動更新で表示（15 分 ISR）。説明ページは `/widget`
- **ワンクリック共有シート** - 温度カード右上の 📤 ボタンから、X 共有 / 画像保存 / URL コピー / ブログ埋め込みを 1 画面にまとめたシェアシート（PC: モーダル / モバイル: ボトムドロワー）を開ける
- **VIX（恐怖指数）** - 現在値 + 30日チャート
- **主要指数** - S&P500, ダウ, ナスダック, 日経平均, TOPIX
- **米国10年債利回り** - チャート付き
- **ドル円為替** - 現在値

## 技術スタック

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS** (スタイリング)
- **Recharts** (チャート描画)
- **yahoo-finance2** (市場データ取得)
- **CNN Fear & Greed API** (センチメントデータ)
- **Vitest + Testing Library** (テスト)

## 開発

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# テスト実行
npm run test:run

# ビルド
npm run build

# 静的データの再生成（通常は月1回GitHub Actionsで自動実行）
npm run generate:stats                      # 米国版 温度帯別リターン
npm run generate:japan-stats                # 日本版 温度帯別リターン
npm run generate:temperature-history        # 米国版 温度推移
npm run generate:japan-temperature-history  # 日本版 温度推移
npm run generate:similar-days               # 類似日検索データ（日本/米国両方）

# X Bot（平日 JST 7:30 に GitHub Actions から実行される）
npm run post:daily-tweet                    # 実投稿（X_API_* が必要）
npm run post:daily-tweet -- --dry-run       # 投稿せず内容確認のみ
```

## デプロイ

Vercel にデプロイを想定。

```bash
vercel
```

### 環境変数

`.env.example` を参照してください。主要な変数:

| 変数 | 用途 | 未設定時の挙動 |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical URL / OGP / sitemap のベース URL | `https://kabuonkei.com` をデフォルトとして使用 |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 の測定 ID（例: `G-XXXXXXXXXX`） | GA タグを出力しない（開発時の安全策） |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console サイト所有権確認コード | verification メタタグを出さない |
| `X_API_KEY` / `X_API_SECRET` / `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET` | X（Twitter）Bot 投稿用（OAuth 1.0a User Context） | `npm run post:daily-tweet` 実行時に起動直後エラー |

### リリース前チェックリスト

- [ ] 独自ドメイン取得 & Vercel 連携
- [ ] `NEXT_PUBLIC_SITE_URL` を本番 URL に設定
- [ ] GA4 プロパティ作成 → `NEXT_PUBLIC_GA_ID` を設定
- [ ] Search Console 登録 → `GOOGLE_SITE_VERIFICATION` を設定 → sitemap 送信
- [ ] 利用規約・プライバシーポリシー・免責事項の文言最終確認

## 法務・運営

- [/about](https://kabuonkei.com/about) サイト説明
- [/widget](https://kabuonkei.com/widget) 埋め込みウィジェットの使い方
- [/terms](https://kabuonkei.com/terms) 利用規約（免責事項を含む）
- [/privacy](https://kabuonkei.com/privacy) プライバシーポリシー

## ライセンス

Private
