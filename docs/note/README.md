# note 連載の運用設計

株温計の外部流入チャネルとしての note 連載の設計・運用ルール。原稿は本ディレクトリで管理し、note への投稿は人間が手動で行う（note に投稿 API は無い）。

## 連載コンセプト

「株温計の中の人」による **独自データ × 市場センチメント** 連載。

- 大手メディアが書けない「自前データの一次情報」で勝負する
- 通説をデータで検証する型（/analysis 記事と同トーン）
- 開発の裏側・思考過程もさらけ出す（LLM 時代は"人格のあるサイト"が強い）

## 導線ルール（全記事共通）

1. **記事末尾に固定フッター**を入れる:
   - サイトリンク（株温計 https://kabuonkei.com ）
   - X bot（毎朝の温度投稿）のフォロー導線
   - 温度アラート（メール通知）の登録導線
2. **サイトへのリンクは UTM パラメータ必須**:
   `?utm_source=note&utm_medium=article&utm_campaign=note-<記事番号>`
   （例: 第1弾 → `note-001`）。GA4 で note 流入を計測する
3. **毎記事に自前図版1枚以上**（引用・転載されやすくする。図版内に `kabuonkei.com` のクレジットを残す）
4. **免責文を必ず入れる**: 「過去そうだった統計であって未来を保証しない」。/analysis 記事と同じ誠実トーンを守る
5. **数字は必ず `src/data/*.json` の実値から引く**。データ更新で数字が変わるため、原稿ヘッダにデータ基準日を明記する

## 無料 / 有料方針

- **集客フェーズ（現在）は全文無料**。目的はサイト認知と流入
- 有料化（500〜1,500円の売り切りレポート）は note フォロワー・サイト流入が立ってから検討（→ 収益化戦略の「買い切り型コンテンツ」）

## 記事ロードマップ

| # | タイトル（仮） | 型 | 主データ | 状態 |
|---|---|---|---|---|
| 001 | 日本版「Fear & Greed Index」が無かったので、自分で作った | 開発ストーリー | japan-historical-stats / japan-temperature-history | 原稿あり（[001-japan-fear-greed-story.md](001-japan-fear-greed-story.md)） |
| 002 | 「極寒で買えば勝率100%」を疑え——111日ぶんの中身を全部バラしてみた | データ検証 | japan-temperature-history / japan-historical-stats | 原稿あり（[002-gokkan-win-rate-anatomy.md](002-gokkan-win-rate-anatomy.md)）。図版5点は未作成 |
| 003 | VIXが30を超えた日、S&P500はどう動いたか | /analysis 転用 | vix-sp500-analysis | 予定 |
| 004 | 信用倍率と市場温度のクロス分析 | データ検証 | margin-ratio-analysis | 予定 |
| 005 | 「極寒」のとき強い業種はどこか — 温度帯×17セクター | データ検証 | japan-sector-heatmap | 予定（サイト未実装の先出しネタ） |

投稿ペースの目安: 隔週1本。相場急変（極寒・沸騰）時は号外的に前倒し可。

## 図版の作り方

- **温度カード（アイキャッチ向け）**: `https://kabuonkei.com/api/og/daily?jp=<score>&us=<score>&date=YYYY-MM-DD` で任意スコア・任意日付の 1200×630 PNG を生成できる（X bot と同じエンドポイント）
- **サイト UI（ゲージ・チャート）**: 本番サイトのスクリーンショット
- **統計表**: note は markdown 表非対応。スタイル付き HTML を組んで headless browser で 2x スケール撮影し画像化する（例: `images/backtest-table.png`。免責文と `kabuonkei.com` クレジットを画像内に入れる）
- 生成した図版は `docs/note/images/` に保存し、原稿から相対パスで参照する

## 投稿フロー

1. 原稿を `docs/note/NNN-<slug>.md` に作成（数字はデータ基準日時点の実値）
2. 図版を `docs/note/images/` に用意
3. 人間レビュー
4. note に手動で転記・投稿（markdown 表は note に無いので箇条書き or 画像に変換）
5. 投稿後、X bot アカウントから note 記事を告知
6. GA4 で `utm_source=note` の流入を確認し、次記事の題材判断に使う
