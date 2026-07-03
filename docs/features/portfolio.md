# 温度連動バーチャルポートフォリオ（`/portfolio`）

株温計の温度スコアに応じて、日経225・S&P500 の株/現金配分を月次に切り替える「逆張り型」ポートフォリオのシミュレーション。過去約10年のバックテストとライブ追跡を公開し、リテンション（毎日 NAV が動く＝毎日見に来る動機）と SEO 資産化（「温度計 戦略 バックテスト」等のキーワード）を狙う。

**重要**: 金商法リスクを下げるため、徹頭徹尾「研究 / シミュレーション」として framing する（"今月◯買え" ではなく "ルールに基づけば理論上このようになっていた"）。`/terms` 第 9 条に「バックテスト・シミュレーション結果の表示について」を明記し、ページ冒頭には赤枠の常時免責バナーを置く。

**ポジショニング（トーン設計、正直版 / 2026-07-03 改訂）**: 過去約10年のバックテストで、温度ルール sym 80/20 は**月次積立（DCA）を日米ともに上回る**。ただし**α の大半は「温度の timing」ではなく「配分の高さ」由来**。`temperatureContribution` フィールドで同じ平均株比率（JP ≈ 68% / US ≈ 65%）の定数配分と比較すると、温度信号の純寄与度は **リターンで JP +0.7pp / US -10.6pp（マイナス）、最大DD でも JP 4.4pp / US 3.8pp 深い（悪化）**。買い持ちより DD が浅いのは温度の効果ではなく配分効果。この事実を `#for-whom` と `#selection` で隠さず開示し、**「温度計は timing ツールでも DD 抑制ツールでもなく、『極寒で狼狽売りしない・沸騰で調子に乗らない』ための規律・物差し」**として位置付ける。サイトの差別化価値は「他の個人投資サイトではやらない厳しい寄与度検証を自ら公開する姿勢」。Dashboard ミニカードは「α vs 積立」を主役、ただし「配分由来が大半」の注記を添え、vs 積立 DD 悪化も合わせて表示。
**符号規約の注意**: `maxDrawdown` 系は**負値**（`computeMaxDrawdown` が負で返す）。したがって差分（自PF − 比較対象）が**負 = 自分のほうが深い（悪化）**。2026-07-03 以前は UI・docs がこれを「負 = 浅い」と誤読して「DD抑制に効く」と記述していた（修正済み。表示整形は `formatDrawdownGap` / `drawdownGapColorClass` を使うこと）。

**3 戦略比較（一括買い持ち / 月次積立 / 温度ルール）**: サイトの主要読者（NISA 積立勢）が**自分のやり方との差分で温度ルールを評価できる**よう、月次積立（DCA）ベンチマークを simulator に組み込み、チャート 3 本・統計表 4 列（温度 / 一括 / 積立 / 温度 vs 積立）で並列表示する。`scripts/_lib/portfolio-sim.ts::simulatePortfolio` は `DailyPoint.benchmarkDca` と `PortfolioStats.dcaReturn/dcaCagr/dcaMaxDrawdown/dcaSharpe/alphaVsDca` を生成し、`startState` の `dcaMonthlyContribution / dcaRemainingContributions` で差分モードにも対応。**ルール選定**: 初期バージョンの sym 60/40（平温で現金40%）は DCA に -8.9pp 負けていたため、`scripts/explore-portfolio-rules.ts`（調査スクリプト、永続化なし）で配分シフト・非対称・極端帯トリガー・温度連動 DCA の 4 系統を網羅テストし、`sym 80/20`（平温で株80%保持、極寒で100%、沸騰で50%）に差し替えた経緯がある。再探索したい場合はこの script を再実行する。**温度信号の寄与度検証**: `scripts/analyze-temperature-contribution.ts` で「sym 80/20 vs 同じ平均株比率の定数配分」の比較を実行できる（`generate-portfolio-history.ts` が自動で `temperatureContribution` JSON フィールドに格納するのでページにも自動反映される）。

## ルール（固定、sym 80/20）
- 対象: 日本 = ^N225 + 現金（日本版温度 = C1+C5 で駆動）/ 米国 = ^GSPC + 現金（VIX→温度で駆動）
- リバランス: **月次**、各月第一営業日に温度帯を判定して目標配分へ移動
- 配分表（ニュートラル 80/20・非対称）: 極寒=株100% / 冷え込み=90% / 平温=80% / 過熱=65% / 沸騰=50%
- 現金金利 / 手数料 / 税金 / スリッページ = すべて 0 固定（記事で明記）
- ベンチマーク: (1) 100% 株の buy & hold（同じ銘柄）、(2) 月次積立（DCA、同じ初期 100 を月数 N で等額按分）
- バックテスト期間: 2016-04-22（日本温度履歴の起点）〜 最新

## データ層
- `src/data/portfolio-history.json`: 日米 2 ポートフォリオの `daily[]` / `trades[]` / `stats` / `current` / `endState` / `cashYieldSensitivity` / `temperatureContribution` を同梱
- 生成（全再生成）: `npm run generate:portfolio-history`（`scripts/generate-portfolio-history.ts`）
- 差分 append: `npm run snapshot:portfolio`（`scripts/snapshot-portfolio.ts`）。既存 JSON の `endState` から継続。`cashYieldSensitivity` は spread で無変更保持（月次フル再生成で更新）
- 純粋関数: `scripts/_lib/portfolio-sim.ts`（`simulatePortfolio` / `DEFAULT_PORTFOLIO_RULE` / `computeStats` / `computeMaxDrawdown` / `computeSharpe`）
- ユニットテスト: `scripts/__tests__/portfolio-sim.test.ts`（リバランス発火 / NAV 保全 / 差分モード連続性）
- アクセサ: `src/lib/portfolio.ts`（`getPortfolioHistory` / `slicePortfolioDailyByDays` / `resolveBandByScore`、`PortfolioCashYieldScenario` / `PortfolioTemperatureContribution` 型）
- **現金金利感度分析**: 同じルールで `cashYield` を 0% / 1% / 3% に差し替えた 3 シナリオを `cashYieldSensitivity[]` に格納。記事の「現金金利シナリオの感度分析」セクションで一覧表示し、MMF/短期金利を仮定したときの相対改善を可視化（sym 80/20 では現金比率が平均 20% 程度なので影響は小さめだが、3% 想定で CAGR +1.0〜1.2pp / Sharpe +0.05〜0.07 改善する）
- **温度信号の寄与度**: `temperatureContribution` フィールドに「sym 80/20 の実現平均株比率を定数で持ち続けた場合」の stats と差分を格納（`avgEquityRatio` / `constantStats` / `alphaVsConstant` / `ddVsConstant` / `sharpeVsConstant`）。記事の `#selection` セクションで「α vs DCA のうち temperature timing 由来 vs 配分効果由来」を明示的に分離表示する

## UI
- ページ本体: `src/app/portfolio/page.tsx`（Server Component、`StaticPageLayout` ベース、`buildArticleJsonLd` で Article JSON-LD 埋込、目次 + 赤枠免責バナー + **青枠 `#scope` ブロック**（「このページは株温計の応用 1 実験であり、コア機能は `/` / `/events` / `/guide` にある」と射程を限定）+ `#for-whom`（寄与度開示付き）+ ルール表 + `PortfolioBody` + `#selection`（**ルール選定プロセスと温度信号の寄与度**：17ルール探索経緯・多重検定リスク・温度信号純寄与度の表）+ 手法 + バイアス（**レジーム依存 = 強気相場では「過熱で減らす」系が構造的に不利**を明記）+ 関連リンク（コア機能を「📊 まずここ」として `/` / `/events` / `/guide` を優先、分析記事は二次配置））
- Client 本体: `src/components/portfolio/PortfolioBody.tsx`（日米タブ / 1Y・5Y・10Y 切替（**デフォルト 10Y** — NAV=100 の起点からの分岐を最も見やすく）/ 現在配分カード / NAV 推移チャート（ComposedChart、**ポートフォリオ = 赤実線固定 `#dc2626`**、ベンチマーク = グレー破線、月次積立 = 青鎖線）/ 統計テーブル（totalReturn / CAGR / maxDD / Sharpe + ベンチ比）/ リバランス履歴（直近 12 件 + 展開）/ `InvestingBooksCTA placement="portfolio"`）
- Dashboard ミニカード: `src/components/PortfolioTeaserCard.tsx` を Dashboard 第 5 章「🔍 詳しく見る」末尾に配置。日米配分・α vs DCA（主役）・最大DD「vs 買い持ち」と「vs 積立」を併記（US は「vs 積立で +10.7pp 深い」警告を amber 色で表示）。`/portfolio?ref=dashboard_teaser` へ誘導。片方が極寒/沸騰時は amber 強調。本文コピーでは「α の大半は配分の高さ由来」注記を追加
- OG 画像: `src/app/portfolio/opengraph-image.tsx`（青系、日米の「積立 比 +Xpp」を主見出しに、温度 / 積立 / 最大DD を並列表示、`buildNotoSansJpFonts` + `THERMOMETER_SVG` 共用）
- GA4 イベント: `portfolio_view` / `portfolio_market_switch` / `portfolio_period_switch` / `portfolio_teaser_click`

## SEO 配線
- sitemap: `/portfolio`（`priority: 0.8`, `changeFrequency: "daily"`, `lastModified = portfolio-history.json.generatedAt`）
- Footer 共通リンクに「温度連動ポートフォリオ」追加
- `/guide/fire-long-term` 末尾の関連リンクに `/portfolio` を追加（長期戦略読者ターゲット）
- `InvestingBooksCTA` は `placement: "portfolio"` と `article?: string`（既定 `"vix-threshold-sp500"`、`/portfolio` では `"portfolio"`）を受けるよう拡張済み

## 自動更新
- `.github/workflows/update-portfolio.yml`: 平日 JST 07:00（cron `0 22 * * 0-4`）に `snapshot:portfolio` を実行。差分があれば commit & push（コミットタイトル `chore(portfolio): daily NAV update YYYY-MM-DD`）
- `.github/workflows/update-historical-stats.yml`: 月次ジョブ末尾に `generate:portfolio-history` を追加（`generate:japan-temperature-history` の後）。差分 append で累積したズレを月 1 回リセット

## 既知の制約
- バックテスト期間は日本温度履歴に合わせて 2016-04-22 以降（約10年）。リーマンショックなどはカバーされない
- 現金金利 0% は保守的（MMF なら 1〜3% 上乗せ可）。手法セクションで明記
- 温度スコア自体（C1+C5 / VIX 推定）の過剰最適化リスクはあり得る。記事で明示
