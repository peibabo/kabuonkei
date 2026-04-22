# TODOS — 株温計

リリース後の機能拡張アイデア。優先度順ではなく、カテゴリでグルーピング。

## コンテンツ展開（イベントページ基盤が出た後）

### イベント個別の解説テキスト
- **What**: `/events/[slug]` 各ページに、当時の背景・意思決定の流れを2〜3段落で追記
- **Why**: 現状のページは自動生成できる数値のみ。SEO 強化と読み物価値のため人間の解説を上書き
- **Pros**: 滞在時間↑、Twitter での引用しやすさ↑
- **Cons**: 手作業 N 本、継続コスト
- **Context**: `src/app/events/[slug]/page.tsx` で event meta に `longDescription?: string` 追加 or `src/content/events/[slug].mdx` 方式も検討
- **Depends on**: イベントページ基盤の実装完了

### 複数イベント横断の比較ページ
- **What**: 「株式暴落 TOP10」「日銀イベント一覧」等のまとめページ
- **Why**: SEO ロングテール + イベントページ群への集約ハブ
- **Pros**: 内部リンク強化、被リンク対象化
- **Cons**: テンプレート設計に時間がかかる
- **Context**: `/events/category/[category]` または `/events` インデックスとして実装

### トップページ「今日と類似のイベント」セクション
- **What**: ダッシュボード top の現在温度のすぐ下に「今日と最も類似したイベント日」カード追加
- **Why**: イベントページへの導線強化
- **Context**: 既存 SimilarDaysCard から TOP1 がイベント付きならバナー化

## 新規機能（CEO review で検討済、今回は見送り）

### 温度×セクター別パフォーマンス・ヒートマップ（APPROACH B）
- **What**: 東証33業種（または17業種）で温度帯ごとの過去1M/3M/6M 平均リターン
- **Why**: 他サイトに無い切り口。差別化・アフィリエイト文脈適合性が高い
- **Pros**: 完全なオリジナル
- **Cons**: yfinance でのセクター別日次10年データ取得が重い / 業種分類の揺れ
- **Context**: `scripts/generate-sector-heatmap.ts` を新規。`historical-stats` のパターン踏襲

### 温度アラート（APPROACH C）
- **What**: メール登録 + 閾値通知
- **Why**: 再訪装置・メール資産化
- **Pros**: 最強の再訪動線
- **Cons**: 個人運営で DB / メール送信基盤 / 特商法対応の継続コスト大。収益化メモの「サブスク不向き」原則と近接
- **Context**: Vercel + Resend + Upstash Redis の3点セット想定

### 用語解説30ページ（ロングテール SEO）
- **What**: VIX / F&G / 信用倍率 / 裁定残 / 騰落レシオ 等、1ページ1用語の解説
- **Why**: 「VIX とは」等の検索流入を拾う
- **Cons**: 書く時間が大きく短期のリターンは低い。イベントページ戦略の後で
- **Context**: `/glossary/[term]` 動的ルート。イベントページと同じ `StaticPageLayout` で量産可能

### クロス分析カード（米国温度×日本株 / 日本温度×S&P500）
- **What**: 温度計と対象市場の 1:1 純粋分離を崩さず、「横の観点」だけ別カードで提示
- **Why**: 日本の個人投資家は S&P500（オルカン等）にも投資している
- **Cons**: 統計的相関は弱めの可能性、注釈必須
- **Context**: `historical-stats` 生成スクリプトに `crossMarket` フラグ追加で拡張可能

### 日本版過去統計の TOPIX 追加
- **What**: 日経225 と並べて TOPIX も出す
- **Why**: バリュー/グロースの色分けが出せる
- **Cons**: 日経225 と相関 0.9+ で情報量増分は小さい
- **Context**: `scripts/generate-japan-historical-stats.ts` に `^TOPX` 追加

### バーチャルポートフォリオ
- **What**: 温度連動型ポートフォリオのパフォーマンス公開
- **Why**: 毎日更新で継続訪問動機化
- **Cons**: 運用工数・誤解リスク大
- **Context**: /plan-ceo-review で将来検討

## データ・運用改善

### 日本版 F&G スナップショットに C2/C3/C4 過去データを整備
- **What**: 海外投資家フロー / 信用倍率 / 裁定残バランスの過去履歴データを確保し、日本版過去統計を5要素フルに
- **Why**: 現状は簡易版（C1+C5）で非対称。CLAUDE.md にも明記されている
- **Cons**: JPX の公開データが週次で深掘りに手間
- **Context**: `scripts/generate-japan-market-data.ts` の履歴取得を強化
