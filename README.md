# 🌡 株温計（かぶおんけい）

「今日の相場、熱い？冷たい？」― 市場の温度を測る日本語版 Fear & Greed ダッシュボード

## 概要

市場のセンチメント（恐怖・欲望）を示す複数の指標を **1画面で俯瞰できる** 日本語Webサービスです。

### 掲載指標

- **Fear & Greed（米国）** - CNN Fear & Greed Indexベースのメインゲージ（0-100）
- **歴史的位置づけバッジ** - 温度カード内に「過去10年中、このスコア以下だった日は XX%」を表示。下位 20% / 上位 20% 時はアラート色で強調
- **市場温度（日本）** - 日本市場独自の5要素バランス型温度スコア
  - 日経225モメンタム（125日MA乖離）/ 海外投資家フロー（直近4週累積）/ 信用倍率 / 裁定残バランス / ドル円50日モメンタム
- **温度の推移チャート（米国版）** - 過去1年分の温度推移を時系列で可視化（期間切り替え対応）
- **温度の推移チャート（日本版）** - 過去10年分の簡易版スコア（C1+C5 2要素）+ 日次記録の5要素フルスコアを2系列で重ね表示（1M/3M/6M/1Y/5Y/10Y 切替）
- **過去の統計（米国版）** - 米国版温度帯別の S&P500 将来リターン統計
- **過去の統計（日本版）** - 日本版温度帯別の日経225・TOPIX 将来リターン統計（カード内タブで切替）
  - 温度計と統計対象市場を 1:1 で揃える純粋分離（米国=S&P500 / 日本=日経225）。TOPIX は連動 ETF `1306.T` を proxy として使用
- **クロス分析（参考値）** - 米国温度×日経225 / 日本温度×S&P500 を1カードでタブ切替表示。純粋分離とは別の参考指標として補助提示
- **温度×セクター ヒートマップ（日本版）** - 日本版温度帯 × TOPIX-17（食品/銀行/機械/電機・精密 等 17 業種）の将来リターン（1M/3M/6M）をヒートマップ表示。現在温度帯の TOP3 業種をハイライトし、過去10年どの業種が強かったかを俯瞰できる
- **今日の類似日** - 今日の温度に最も近かった過去日 TOP5 と、その日からの1M/3M/6M将来リターンをナラティブで表示
  - 主要経済イベント（コロナショック底、Brexit、令和のブラックマンデー等）はラベル付き
- **イベント詳細ページ（`/events/[slug]`）** - 14件の主要市場イベントについて、その日の日米温度・前後±90日の温度推移・1M/3M/6M/1Y 実リターンに加え、各イベントごとの「当時の背景と市場心理」解説（Markdown 本文、1本 500〜600字）を表示する恒久 URL（全件 SSG、イベント別 OG 画像付き）
- **主要イベント一覧（`/events`）** - 14件を日付降順で俯瞰できるインデックスページ。Footer・About・類似日カード末尾から導線あり
- **投資家タイプ別ガイド（`/guide`）** - NISA積立 / 短期トレーダー / FIRE目指し の 3 タイプ別に、温度帯ごとの具体的なアクション指針を解説するガイドページ。Footer・About から導線あり
- **分析記事（`/analysis`）** - 独自データを掛け合わせた深掘り SEO 記事。現在3本公開：
  - 「日本だけ熱い・米国は冷静——日米温度の乖離が ±20 を超えた日、その後の日経225 と S&P500 はどう動いたか？」（`/analysis/temperature-divergence`）: 日米温度差バンド × {S&P500, 日経225} の翌 1/3/6ヶ月リターン + N225-S&P500 平均スプレッド、温度差 × 日本版温度のクロス市場 2D
  - 「信用倍率 × 株温計 — 過去10年の徹底検証」（`/analysis/margin-ratio-temperature`）: JPX 公表の週次信用倍率 × 株温計 × 日経225 の 2D ヒートマップ
  - 「VIX が 30 を超えた日、その後 S&P500 はどう動いたか？— 過去20年の検証」（`/analysis/vix-threshold-sp500`）: VIX バンド別の S&P500・日経225 翌 1/3/6ヶ月リターンと、VIX × 日本版温度のクロス市場 2D
- **温度連動ポートフォリオ（`/portfolio`）** - 株温計の温度スコアで株/現金比率を月次に切り替える日米 2 ポートフォリオのシミュレーション（バックテスト + ライブ追跡）。過去約10年で**月次積立 (DCA) を日米ともに上回る**結果（JP +38pp / US +42pp）。一括買い持ち / 月次積立（DCA） / 温度ルール の 3 戦略比較、NAV 推移チャート（1Y/5Y/10Y）、リバランス履歴、CAGR / 最大DD / Sharpe を表示。毎営業日 JST 07:00 に自動更新。投資助言ではなく研究公開として位置付け（`/terms` 第 9 条で明記）
- **あなたのスタイル別の読み方カード** - ダッシュボード内（過去統計の直下）に配置し、タブ切替で現在温度に応じた 1〜2 行の行動指針を表示。極寒/沸騰時は amber 強調 + 注意書き。選択タイプは localStorage で保持
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
npm run generate:japan-temperature-history  # 日本版 温度推移（平日17:00 JSTにも自動再生成）
npm run generate:similar-days               # 類似日検索データ（日本/米国両方）
npm run generate:cross-stats                # クロス分析（米国温度×日経225 / 日本温度×S&P500）
npm run generate:score-distribution         # 温度スコア分布（過去10年の歴史的位置づけ用）
npm run generate:margin-history             # 信用倍率の 20 年超週次バックフィル（JPX 連結 Excel）
npm run generate:margin-analysis            # 信用倍率 × 株温計 × 日経225 の分析 JSON（/analysis 用）
npm run generate:vix-sp500                  # VIX × S&P500 × 日経225 + JP温度クロスの分析 JSON（/analysis 用）
npm run generate:divergence                 # 日米温度の乖離 × {N225, S&P500} 前方リターン分析 JSON（/analysis 用）
npm run generate:portfolio-history          # 温度連動ポートフォリオ バックフィル（/portfolio 用、月次フル再生成）
npm run snapshot:portfolio                  # 温度連動ポートフォリオ 日次 append（平日 JST 07:00 に自動実行）

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
