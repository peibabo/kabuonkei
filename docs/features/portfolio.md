# 温度連動バーチャルポートフォリオ（`/portfolio`）

株温計の温度スコアに応じて、日経225・S&P500 の株/現金配分を月次に切り替える「逆張り型」ポートフォリオのシミュレーション。過去約10年のバックテストとライブ追跡を公開し、リテンション（毎日 NAV が動く＝毎日見に来る動機）と SEO 資産化（「温度計 戦略 バックテスト」等のキーワード）を狙う。

**重要**: 金商法リスクを下げるため、徹頭徹尾「研究 / シミュレーション」として framing する（"今月◯買え" ではなく "ルールに基づけば理論上このようになっていた"）。`/terms` 第 9 条に「バックテスト・シミュレーション結果の表示について」を明記し、ページ冒頭には赤枠の常時免責バナーを置く。

**ポジショニング（トーン設計、正直版 / 2026-11-17 改訂）**: 2026-11-17 に日本版の温度を C1（日経225 × 125日移動平均乖離）に一本化し、あわせて日本版の最初の約 13 か月（2016-04〜2017-05）にスコアが欠けて温度ルールが現金 100% のままになっていた不具合を直して全期間を再計算した（不具合は、推移 JSON が「直近 10 年」の取得範囲で、移動平均の 125 営業日分だけスコアの始まりが遅れることが原因。現在は `generate-portfolio-history.ts` が取得済みの ^N225 から直接 C1 を計算する）。結果、温度ルール sym 80/20 と月次積立（DCA）の差は **JP +19.8pp / US +47.1pp**。その内訳は「配分を高めに保った」効果（JP +49.4pp / US +57.2pp）と温度信号の純寄与（同じ平均株比率 JP ≈ 73% / US ≈ 65% の定数配分との差、`temperatureContribution`）の合計で、純寄与は **リターンで JP -29.7pp / US -10.1pp、最大DD でも JP 2.1pp / US 3.8pp 深い（悪化）**。ルール（sym 80/20）は 2026-07 に旧定義の温度で選んだもので、定義変更後も選び直していない（過剰最適化を強めないため。ページにも明記）。本文の結果依存の主な箇所は JSON の値から組み立てている（符号で言い回しを変える箇所もあるが、すべてではない）。この事実を `#for-whom` と `#selection` で隠さず開示し、**「温度計は timing ツールでも DD 抑制ツールでもなく、『極寒で狼狽売りしない・沸騰で調子に乗らない』ための規律・物差し」**として位置付ける。サイトの差別化価値は「他の個人投資サイトではやらない厳しい寄与度検証を自ら公開する姿勢」。Dashboard ミニカードは「α vs 積立」を主役、ただし「配分由来が大半」の注記を添え、vs 積立 DD 悪化も合わせて表示。
**符号規約の注意**: `maxDrawdown` 系は**負値**（`computeMaxDrawdown` が負で返す）。したがって差分（自PF − 比較対象）が**負 = 自分のほうが深い（悪化）**。2026-07-03 以前は UI・docs がこれを「負 = 浅い」と誤読して「DD抑制に効く」と記述していた（修正済み。表示整形は `formatDrawdownGap` / `drawdownGapColorClass` を使うこと）。

**3 戦略比較（一括買い持ち / 月次積立 / 温度ルール）**: サイトの主要読者（NISA 積立勢）が**自分のやり方との差分で温度ルールを評価できる**よう、月次積立（DCA）ベンチマークを simulator に組み込み、チャート 3 本・統計表 4 列（温度 / 一括 / 積立 / 温度 vs 積立）で並列表示する。`scripts/_lib/portfolio-sim.ts::simulatePortfolio` は `DailyPoint.benchmarkDca` と `PortfolioStats.dcaReturn/dcaCagr/dcaMaxDrawdown/dcaSharpe/alphaVsDca` を生成し、`startState` の `dcaMonthlyContribution / dcaRemainingContributions` で差分モードにも対応。**ルール選定**: 初期バージョンの sym 60/40（平温で現金40%）は DCA に -8.9pp 負けていたため、`scripts/explore-portfolio-rules.ts`（調査スクリプト、永続化なし）で配分シフト・非対称・極端帯トリガー・温度連動 DCA の 4 系統を網羅テストし、`sym 80/20`（平温で株80%保持、極寒で100%、沸騰で50%）に差し替えた経緯がある。再探索したい場合はこの script を再実行する。温度連動 DCA（A-4）は 2026-11 まで基本月額を「総額 ÷ 全期間の倍率の合計」で決めており、将来の温度分布を先に知っている前提（ルック・アヘッド）だった。現在は「総額 ÷ 月数」で固定し、予算が尽きたら止め、同じ月に予算を使い切る普通の積立と比べた「温度の効果」も出力する。**温度信号の寄与度検証**: `scripts/analyze-temperature-contribution.ts` で「sym 80/20 vs 同じ平均株比率の定数配分」の比較を実行できる（`generate-portfolio-history.ts` が自動で `temperatureContribution` JSON フィールドに格納するのでページにも自動反映される）。

## ルール（固定、sym 80/20）
- 対象: 日本 = ^N225 + 現金（日本版 市場温度 = 日経225 × 125日移動平均乖離で駆動。2026-11-17 に C1+C5 から切り替えて全期間を再計算）/ 米国 = ^GSPC + 現金（VIX→温度で駆動）
- リバランス: **月次**、各月第一営業日に温度帯を判定して目標配分へ移動
- 配分表（ニュートラル 80/20・非対称）: 極寒=株100% / 冷え込み=90% / 平温=80% / 過熱=65% / 沸騰=50%
- 現金金利 / 手数料 / 税金 / スリッページ = すべて 0 固定（記事で明記）
- ベンチマーク: (1) 100% 株の buy & hold（同じ銘柄）、(2) 月次積立（DCA、同じ初期 100 を月数 N で等額按分）
- バックテスト期間: 2016-04-22（日本温度履歴の起点）〜 最新

## データ層
- `src/data/portfolio-history.json`: 日米 2 ポートフォリオの `daily[]` / `trades[]` / `stats` / `current` / `endState` / `cashYieldSensitivity` / `temperatureContribution` を同梱
- 生成（全再生成）: `npm run generate:portfolio-history`（`scripts/generate-portfolio-history.ts`）
- 差分 append: `npm run snapshot:portfolio`（`scripts/snapshot-portfolio.ts`）。既存 JSON の `endState` から継続。既存の最終日を `previousDate` として渡し、同じ月の日は月初扱いしない（2026-11 までは追記した先頭日を毎回月初とみなし、月の途中でも温度帯が変わればリバランスしていた）。`cashYieldSensitivity` は spread で無変更保持（月次フル再生成で更新）
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
- `.github/workflows/update-portfolio.yml`: 平日 JST 7 時台（Vercel Cron の `morning` ジョブが起動。ワークフローの schedule `0 22 * * 0-4` は予備）に `snapshot:portfolio` を実行。差分があれば commit & push（コミットタイトル `chore(portfolio): daily NAV update YYYY-MM-DD`）
- `.github/workflows/update-historical-stats.yml`: 月次ジョブ末尾に `generate:portfolio-history` を追加（`generate:japan-temperature-history` の後）。差分 append で累積したズレを月 1 回リセット

## 既知の制約
- バックテスト期間は日本温度履歴に合わせて 2016-04-22 以降（約10年）。リーマンショックなどはカバーされない
- 現金金利 0% は保守的（MMF なら 1〜3% 上乗せ可）。手法セクションで明記
- 温度スコア自体（日本の市場温度 / VIX 推定）の過剰最適化リスクはあり得る。記事で明示

## 参考シナリオ: 積立＋極寒で上乗せ（2026-11-17 追加）

- 毎月の積立額は月次積立（DCA）と同じで、**月初の温度が極寒の月だけ 3 倍**（`COLD_BOOST_MULTIPLIER`）買う。予算（initialNav）が尽きたら止める。未来の温度は使わない
- 対照の「同じ速さの積立」= 上乗せシナリオと同じ月に予算を使い切る普通の積立。上乗せとの差を**おおむね温度の効果**とみなす（多く買った分だけ早く投じた効果を除いたもの）。対照の使い切り月は全期間の月初スコアから決める（対照側だけが未来を知っている）。極寒の月が期間の途中にあると、上乗せ側は温度と無関係にわずかに早く投じるため、温度の効果にはその差も一部含まれる（2026-11 の第三者レビューの試算では JP で約 1pp）
- 実装: `scripts/_lib/portfolio-sim.ts` の `simulatePortfolio()` が日次系列 `benchmarkDcaBoost` / `benchmarkDcaSameSpeed` を出し、計画は `planColdBoost()`（各月初のスコアだけで予算を使い切る月を決める）、成績は `computeColdBoostStats()`。JSON の `portfolios.{jp,us}.coldBoostDca` に計画と成績を保存し、日次 append（`snapshot-portfolio.ts`）は計画を保持して成績だけ再計算する。終端状態（`boostUnits` / `boostCash` / `sameSpeed*`）も引き継ぐ
- UI: `PortfolioBody` の推移チャートに 1 本追加し、統計表の下に `ColdBoostCard`（3 シナリオの比較・積立との差・温度の効果・極寒の回数）。`/portfolio` の結論にも短い案内
- 2026-11-17 時点の結果: 積立との差 JP +10.3pp / US +7.7pp、うち温度の効果 JP +3.8pp / US +2.3pp。月初が極寒だったのは 128 か月中 3 回（JP 2019-01・2020-04・2020-05 / US 2020-04・2020-05・2020-11、実質 2 局面）で、根拠は薄い。同じ回数の上乗せをランダムな月に置くプラセボ（5,000 通り）と比べると、JP は 99 パーセンタイル（ランダムの 95% 点 +2.8pp）、US は 88 パーセンタイル（同 +3.25pp）で、**US は偶然と区別できない**。温度ルール（sym 80/20）の成績を見たあとに追加したシナリオで、倍率 3 倍も 1 つの例である旨をカード内で開示している
- 経緯: 温度ルールのうち「過熱・沸騰で株を減らす」側が上昇相場で不利に働いた一方、「極寒で買い増す」側だけを取り出すと日米ともわずかにプラスだった（`npm run` ではなく `npx tsx scripts/explore-portfolio-rules.ts` の A-4 で再現できる。A-4 のルック・アヘッドは #141 で修正。#141 を先にマージしないと、この記述と実装が食い違う）

