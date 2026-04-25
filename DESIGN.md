# 株温計 デザインシステム

> **Source of truth.** トップ画面 B 案「朝刊コラム」を起点として 2026-04-25 に確立。
> 既存の章セクション（推移 / 統計 / ヒント / 詳細 / 生データ）は従来のカードトーンを維持し、
> ヒーローのみ「紙面」レイヤーで意図的に違うリズムを作る二層構造。

## 1. 思想

- **読み物として正しい**: 投資情報サイトとして信頼を損なわない、編集物の佇まい
- **第一印象 = ブランド**: 朝刊の紙面メタファーで「株温計の見た目」を確立
- **温度はアクセント色**: 数値ハイライトのみに sentiment 動的色を使い、面で塗らない
- **モバイルでも紙面感**: 罫線・明朝・余白の規律を縦 1 列でも崩さない

## 2. カラー

### 紙面トーン（ヒーロー / Header / Body 背景）

| 用途 | 値 | Tailwind |
|---|---|---|
| body 背景（温白色） | `#fafaf7` | `bg-[#fafaf7]` |
| ヒーローカード背景 | `#ffffff` | `bg-white` |
| 罫線 (主) | `#111827` 1.5px | `border-gray-900` |
| 罫線 (副) | `#d1d5db` 1px | `border-gray-300` |
| 文字 (主) | `#111111` | `text-gray-900` |
| 文字 (本文) | `#374151` | `text-gray-700` |
| 文字 (補助) | `#6b7280` | `text-gray-500` |

### 温度アクセント（数値のみに適用）

`src/lib/sentiment.ts#getSentimentColor()` を継続。

| スコア | 値 | レベル |
|---|---|---|
| 0–20 | `#2563eb` (blue-600) | 極寒 |
| 21–40 | `#0ea5e9` (sky-500) | 冷え込み |
| 41–60 | `#ca8a04` (yellow-600) | 平温 |
| 61–80 | `#ea580c` (orange-600) | 過熱 |
| 81–100 | `#dc2626` (red-600) | 沸騰 |

色は「面塗り禁止」。タイル内大型数字 + sparkline の線色のみに使う。

## 3. タイポグラフィ

| 用途 | フォント | Tailwind | 備考 |
|---|---|---|---|
| 朝刊見出し（H1 / Hero H2） | **Noto Serif JP 800** | `.font-serif-jp font-extrabold` | `next/font/google` で読み込み、`--font-serif-jp` 経由 |
| 本文 (和文) | **Noto Sans JP 400 / 500** | （body 既定） | `--font-sans` のチェーン先頭 |
| 数値 | **Geist Mono / tabular-nums** | `tabular-nums` または `font-mono` | スコア・パーセント・通貨で固定幅化 |
| 欧文ロゴ・補助 | Geist Sans | （body 既定） | 和文フォント未読込時のフォールバック |

`font-family` チェーン: `var(--font-sans-jp), var(--font-geist-sans), Arial, Helvetica, sans-serif`

## 4. レイアウト・カード形状

### 紙面レイヤー（ヒーロー / 号数帯）

- `rounded-none`（角なし）
- `border-y` 1.5px gray-900（朝刊上下罫線）
- セクション内罫線は `border-gray-300` 1px
- 余白: `px-6 py-8 md:px-10 md:py-10`
- `font-serif-jp` の見出しと組み合わせる

### 章カードレイヤー（Trend 以下）

既存維持: `rounded-2xl shadow-md p-6 md:p-8`

### 余白規則

- 章間: `mb-10`（既存 `DashboardSection`）
- ヒーロー → タイル: `mb-8` → `mb-10`
- 本文行間: `leading-relaxed`（読み物リズム）

## 5. CTA

ヒーロー内 2 つ：

- **Primary**: `bg-gray-900 text-white` 角なし、`hover:bg-gray-700`
- **Secondary**: `border border-gray-900 bg-white text-gray-900`、`hover:bg-gray-100`

CTA ラベル末尾は半角矢印 `→` で統一。

## 6. コンポーネント変種マップ

| コンポーネント | レイヤー | 形状ルール |
|---|---|---|
| `DashboardHeader` | 紙面 | タイトル明朝 + 罫線帯 |
| `HeadlineHero` | 紙面 | `border-y` + 大型明朝見出し |
| `TemperatureTiles` | 紙面 | 細罫線タイル × 2（日米平均 / 昨日比、半円ゲージ章カードの内側に配置） |
| `Sparkline`（独自 SVG） | 紙面 | 線色 = sentiment / gray-700 |
| `FearGreedGauge` | 章カード | 既存 `rounded-2xl` 維持 |
| `SimilarDaysCard` 等 | 章カード | 既存維持 |
| `AlertBanner` | 紙面隣接 | 警告色 amber 維持（紙面と独立） |

## 7. 拡張ガイド

新規 UI を作るときの判断軸：

- **「結論を一発で見せる」要素** → 紙面レイヤー（罫線 + 明朝）
- **「データを並べる / 操作する」要素** → 章カード（rounded + shadow）
- **混ぜない** こと。紙面の中に shadow カードを入れない、章カードの中に明朝大見出しを入れない

## 8. NOT in Scope（現時点で未対応）

- ダークモード（朝刊メタファーはライト固定が自然）
- shadcn/ui 導入（既存 Tailwind ユーティリティで十分）
- 動的見出しの LLM 生成（決定木 v1 で運用、品質が頭打ちなら v2 で検討）

## 9. 変更履歴

| 日付 | 変更 |
|---|---|
| 2026-04-25 | B 案「朝刊コラム」適用に伴い初版確立 |
| 2026-04-25 | ヒーロー直下に半円ゲージ（株温計＝温度計）を復帰、タイルは平均/昨日比の 2 つにスリム化 |
