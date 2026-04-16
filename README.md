# 🌡 株温計（かぶおんけい）

「今日の相場、熱い？冷たい？」― 市場の温度を測る日本語版 Fear & Greed ダッシュボード

## 概要

市場のセンチメント（恐怖・欲望）を示す複数の指標を **1画面で俯瞰できる** 日本語Webサービスです。

### Phase 1（MVP）掲載指標

- **CNN Fear & Greed Index** - メインゲージ（0-100）+ 7つのサブ指標
- **温度の推移チャート** - 過去1年分の温度推移を時系列で可視化（期間切り替え対応）
- **VIX（恐怖指数）** - 現在値 + 30日チャート
- **日経VI** - 現在値 + 30日チャート
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
```

## デプロイ

Vercel にデプロイを想定。

```bash
vercel
```

## ライセンス

Private
