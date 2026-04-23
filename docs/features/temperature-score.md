# 温度スコアの2本立て

株温計には2種類の市場温度スコアがある。

## Fear & Greed（米国版）
- ソース: CNN Fear & Greed API（bot検知でブロックされた場合はVIXベースの簡易推定にフォールバック）
- 計算: `src/lib/fear-greed.ts::fetchFearGreedIndex()` / `estimateFearGreedFromVix()`
- 実質的に米国市場（S&P500）のセンチメントを示す

## 市場温度（日本版）
- ソース: 5要素の等ウェイト平均（すべて既存データで算出）
  1. **日経225モメンタム**: 125日移動平均との乖離率（C1）
  2. **海外投資家フロー**: 直近4週の売買差引累計（C2、億円）
  3. **信用倍率**: 買残÷売残（C3）
  4. **裁定残バランス**: 買残÷(買残+売残)（C4）
  5. **ドル円モメンタム**: 50営業日モメンタム（C5、%）
- 計算: `src/lib/japan-fear-greed/` 配下（公開 API は `@/lib/japan-fear-greed` から import）。エントリポイントは `computeJapanFearGreed()`
- 閾値定数: `JAPAN_FG_THRESHOLDS`（`src/lib/japan-fear-greed/thresholds.ts`）
- 欠損処理: 利用可能な要素のみで合成。2要素未満の場合はnullを返す
- UI: `src/components/FearGreedGauge.tsx`（`market: "us" | "jp"` の判別ユニオン prop で日米共通。PC は左=日本版 / 右=米国版の 2 列配置。見出しは 🇯🇵 / 🇺🇸 の国旗絵文字付きで国識別を明示）
