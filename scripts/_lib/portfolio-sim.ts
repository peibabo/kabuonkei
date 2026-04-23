/**
 * 温度連動ポートフォリオの時系列シミュレーション（純粋関数）。
 *
 * 入力:
 *   - priceMap / priceDates: 対象指数（^N225 / ^GSPC）の日次終値
 *   - scoreOf(date): 当日の温度スコア（0-100）。null なら当日はリバランスをスキップ
 *   - rule: 温度帯→株比率の閾値テーブル + 初期現金
 *
 * 出力:
 *   - daily: 日次 NAV / ベンチマーク NAV / 株比率 / スコア
 *   - trades: リバランス発生日のログ
 *   - stats: totalReturn / benchmarkReturn / cagr / sharpe / maxDrawdown
 *
 * 差分モード: startState を渡すと、既存の最終状態から続きを計算する。
 *
 * 設計メモ:
 *   - NAV 保全不変式: リバランス前後で NAV は変化しない（検証はテストで担保）
 *   - 現金金利・手数料・税金は 0 固定（シンプルさ優先、記事で明記）
 */

import type { SentimentLevel } from "../../src/lib/types";

/** 温度帯 → 株比率の定義 */
export interface BandRule {
  level: SentimentLevel;
  /** スコア範囲（両端含む） */
  scoreRange: [number, number];
  /** 株比率（0-1） */
  equityRatio: number;
}

/** ポートフォリオ運用ルール */
export interface PortfolioRule {
  bands: BandRule[];
  /** リバランス方式（将来拡張用。現状は monthly-first-business-day 固定） */
  rebalance: "monthly-first-business-day";
  /** 現金金利（年率、デフォルト 0） */
  cashYield: number;
  /** 手数料率（デフォルト 0） */
  fees: number;
  /** 初期 NAV（正規化値。既定 100） */
  initialNav: number;
}

export interface DailyPoint {
  date: string;
  nav: number;
  /** ベンチマーク 1: 一括買い持ち（初日に initialNav 全額を株に投入し保有） */
  benchmark: number;
  /**
   * ベンチマーク 2: 月次積立（DCA）。
   * initialNav を月数 N で等額按分し、毎月第一営業日にその月分を株に投入する。
   * 未投入の現金は NAV に含まれる（現金金利ゼロ前提なので評価額は変化しない）。
   * これにより「同じ 100 の元手をどう展開するか」で 3 戦略を直接比較できる。
   */
  benchmarkDca: number;
  equityRatio: number;
  score: number | null;
}

export interface TradeLog {
  date: string;
  score: number;
  band: SentimentLevel;
  fromEquityRatio: number;
  toEquityRatio: number;
  navBefore: number;
}

export interface PortfolioStats {
  totalReturn: number; // %
  benchmarkReturn: number; // % (一括買い持ち)
  alpha: number; // pp (vs 一括買い持ち)
  cagr: number; // %
  benchmarkCagr: number; // %
  maxDrawdown: number; // % (負の値)
  benchmarkMaxDrawdown: number; // %
  sharpe: number; // 無次元（日次リターンから年率換算）
  benchmarkSharpe: number;
  /** 積立（DCA）ベンチマークとの比較 */
  dcaReturn: number; // %
  dcaCagr: number; // %
  dcaMaxDrawdown: number; // % (負の値)
  dcaSharpe: number; // 無次元
  /** 温度ルール vs 積立（DCA）の差分（pp） */
  alphaVsDca: number;
}

/** 既存の累積状態（差分モード用） */
export interface SimulatorStartState {
  /** 株の「ユニット数」（株価を掛けると時価） */
  equityUnits: number;
  /** 現金残高 */
  cash: number;
  /** ベンチマーク側のユニット数（初日に全額ロック済み） */
  benchmarkUnits: number;
  /** 直近の目標株比率 */
  lastEquityRatio: number;
  /** DCA ベンチマーク: 累積で買った株ユニット数 */
  dcaUnits?: number;
  /** DCA ベンチマーク: 未投入の現金残高 */
  dcaCash?: number;
  /** DCA ベンチマーク: 1 回あたりの積立額（按分済み） */
  dcaMonthlyContribution?: number;
  /** DCA ベンチマーク: 残り投入回数 */
  dcaRemainingContributions?: number;
}

export interface SimulateOptions {
  priceMap: Map<string, number>;
  priceDates: string[]; // ソート済み
  /** 当日のスコア（ない日は null） */
  scoreOf: (date: string) => number | null;
  rule: PortfolioRule;
  /** 差分モードで使う開始状態。未指定なら初日全額現金スタート */
  startState?: SimulatorStartState;
  /** 対象日付の範囲（指定されなければ priceDates 全域） */
  startDate?: string;
  endDate?: string;
}

export interface SimulateResult {
  daily: DailyPoint[];
  trades: TradeLog[];
  stats: PortfolioStats;
  /** 継続シミュレーション用の終端状態 */
  endState: SimulatorStartState;
}

export const DEFAULT_PORTFOLIO_RULE: PortfolioRule = {
  bands: [
    { level: "極寒", scoreRange: [0, 20], equityRatio: 1.0 },
    { level: "冷え込み", scoreRange: [21, 40], equityRatio: 0.9 },
    { level: "平温", scoreRange: [41, 60], equityRatio: 0.8 },
    { level: "過熱", scoreRange: [61, 80], equityRatio: 0.65 },
    { level: "沸騰", scoreRange: [81, 100], equityRatio: 0.5 },
  ],
  rebalance: "monthly-first-business-day",
  cashYield: 0,
  fees: 0,
  initialNav: 100,
};

/** 温度スコア → 株比率 / 温度帯 */
export function resolveBand(
  score: number,
  bands: BandRule[]
): BandRule {
  for (const b of bands) {
    if (score >= b.scoreRange[0] && score <= b.scoreRange[1]) return b;
  }
  // フェイルセーフ: 範囲外は末尾
  return bands[bands.length - 1];
}

/** 月次第一営業日フラグ — 指定日のリストに対して、各月で最初に出てくる日付セット */
export function computeFirstBusinessDays(dates: string[]): Set<string> {
  const set = new Set<string>();
  let prevMonth = "";
  for (const d of dates) {
    const ym = d.slice(0, 7);
    if (ym !== prevMonth) {
      set.add(d);
      prevMonth = ym;
    }
  }
  return set;
}

/**
 * 温度連動ポートフォリオの時系列を計算する。
 * rule.rebalance = "monthly-first-business-day" の月次リバランスのみサポート。
 */
export function simulatePortfolio(opts: SimulateOptions): SimulateResult {
  const { priceMap, priceDates, scoreOf, rule, startState } = opts;

  const startIdx = opts.startDate
    ? priceDates.findIndex((d) => d >= opts.startDate!)
    : 0;
  const endIdx = opts.endDate
    ? priceDates.findIndex((d) => d > opts.endDate!) - 1
    : priceDates.length - 1;
  const effectiveEnd = endIdx < 0 ? priceDates.length - 1 : endIdx;

  if (startIdx < 0 || startIdx > effectiveEnd) {
    throw new Error("simulatePortfolio: 指定範囲に価格データがありません");
  }

  const targetDates = priceDates.slice(startIdx, effectiveEnd + 1);
  const firstBusinessDays = computeFirstBusinessDays(targetDates);

  let equityUnits = startState?.equityUnits ?? 0;
  let cash = startState?.cash ?? rule.initialNav;
  let benchmarkUnits = startState?.benchmarkUnits ?? 0;
  let lastEquityRatio = startState?.lastEquityRatio ?? 0;

  // DCA ベンチマーク: フル実行時は月数ベースで等額按分、差分モードでは引き継ぐ
  let dcaUnits = startState?.dcaUnits ?? 0;
  let dcaCash =
    startState?.dcaCash ?? (startState ? 0 : rule.initialNav);
  let dcaMonthlyContribution = startState?.dcaMonthlyContribution ?? 0;
  let dcaRemainingContributions = startState?.dcaRemainingContributions ?? 0;
  if (!startState) {
    const totalMonths = firstBusinessDays.size;
    if (totalMonths > 0) {
      dcaMonthlyContribution = rule.initialNav / totalMonths;
      dcaRemainingContributions = totalMonths;
    }
  }

  const daily: DailyPoint[] = [];
  const trades: TradeLog[] = [];

  for (let i = 0; i < targetDates.length; i++) {
    const date = targetDates[i];
    const price = priceMap.get(date);
    if (price == null) continue;

    // 初日（差分モードでない）: ベンチマークに全額ロック
    if (!startState && benchmarkUnits === 0) {
      benchmarkUnits = rule.initialNav / price;
    }

    // 日次現金金利（年率 → 日率、cashYield=0 なら変化なし）
    // 温度ルール側と DCA 側の双方の現金に同じ金利を適用する
    if (rule.cashYield > 0) {
      const dailyFactor = 1 + rule.cashYield / 252;
      cash *= dailyFactor;
      dcaCash *= dailyFactor;
    }

    // NAV 計算（リバランス前）
    const navBefore = equityUnits * price + cash;

    // リバランス判定
    const isRebalance = firstBusinessDays.has(date);
    let todayRatio = lastEquityRatio;
    if (isRebalance) {
      const score = scoreOf(date);
      if (score != null) {
        const band = resolveBand(score, rule.bands);
        const targetRatio = band.equityRatio;
        if (Math.abs(targetRatio - lastEquityRatio) > 1e-9 || equityUnits === 0) {
          const targetEquityValue = navBefore * targetRatio;
          equityUnits = targetEquityValue / price;
          cash = navBefore - targetEquityValue;
          trades.push({
            date,
            score,
            band: band.level,
            fromEquityRatio: lastEquityRatio,
            toEquityRatio: targetRatio,
            navBefore,
          });
          lastEquityRatio = targetRatio;
          todayRatio = targetRatio;
        }
      }

      // DCA: 月初に 1 回分を現金から株へ（金利・スコア非依存）
      if (dcaRemainingContributions > 0 && dcaMonthlyContribution > 0) {
        const buyAmount = Math.min(dcaMonthlyContribution, dcaCash);
        if (buyAmount > 0) {
          dcaUnits += buyAmount / price;
          dcaCash -= buyAmount;
        }
        dcaRemainingContributions -= 1;
      }
    }

    const nav = equityUnits * price + cash;
    const actualRatio = nav > 0 ? (equityUnits * price) / nav : todayRatio;
    const dcaNav = dcaUnits * price + dcaCash;

    daily.push({
      date,
      nav: round2(nav),
      benchmark: round2(benchmarkUnits * price),
      benchmarkDca: round2(dcaNav),
      equityRatio: round4(actualRatio),
      score: scoreOf(date),
    });
  }

  const stats = computeStats(daily, rule.initialNav);

  const endState: SimulatorStartState = {
    equityUnits,
    cash,
    benchmarkUnits,
    lastEquityRatio,
    dcaUnits,
    dcaCash,
    dcaMonthlyContribution,
    dcaRemainingContributions,
  };

  return { daily, trades, stats, endState };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** CAGR / DD / Sharpe を計算 */
export function computeStats(
  daily: DailyPoint[],
  initialNav: number
): PortfolioStats {
  if (daily.length < 2) {
    return {
      totalReturn: 0,
      benchmarkReturn: 0,
      alpha: 0,
      cagr: 0,
      benchmarkCagr: 0,
      maxDrawdown: 0,
      benchmarkMaxDrawdown: 0,
      sharpe: 0,
      benchmarkSharpe: 0,
      dcaReturn: 0,
      dcaCagr: 0,
      dcaMaxDrawdown: 0,
      dcaSharpe: 0,
      alphaVsDca: 0,
    };
  }

  const first = daily[0];
  const last = daily[daily.length - 1];
  const totalReturn = ((last.nav - initialNav) / initialNav) * 100;
  const benchmarkReturn =
    ((last.benchmark - initialNav) / initialNav) * 100;
  const dcaReturn =
    ((last.benchmarkDca - initialNav) / initialNav) * 100;

  // 年数: カレンダー日数ベース
  const years =
    (new Date(last.date).getTime() - new Date(first.date).getTime()) /
    (365.25 * 24 * 3600 * 1000);

  const cagr =
    years > 0
      ? (Math.pow(last.nav / initialNav, 1 / years) - 1) * 100
      : 0;
  const benchmarkCagr =
    years > 0
      ? (Math.pow(last.benchmark / initialNav, 1 / years) - 1) * 100
      : 0;
  const dcaCagr =
    years > 0
      ? (Math.pow(last.benchmarkDca / initialNav, 1 / years) - 1) * 100
      : 0;

  const maxDrawdown = computeMaxDrawdown(daily.map((d) => d.nav));
  const benchmarkMaxDrawdown = computeMaxDrawdown(
    daily.map((d) => d.benchmark)
  );
  const dcaMaxDrawdown = computeMaxDrawdown(
    daily.map((d) => d.benchmarkDca)
  );

  const dailyReturns = computeDailyReturns(daily.map((d) => d.nav));
  const benchmarkDailyReturns = computeDailyReturns(
    daily.map((d) => d.benchmark)
  );
  const dcaDailyReturns = computeDailyReturns(
    daily.map((d) => d.benchmarkDca)
  );
  const sharpe = computeSharpe(dailyReturns);
  const benchmarkSharpe = computeSharpe(benchmarkDailyReturns);
  const dcaSharpe = computeSharpe(dcaDailyReturns);

  return {
    totalReturn: round2(totalReturn),
    benchmarkReturn: round2(benchmarkReturn),
    alpha: round2(totalReturn - benchmarkReturn),
    cagr: round2(cagr),
    benchmarkCagr: round2(benchmarkCagr),
    maxDrawdown: round2(maxDrawdown),
    benchmarkMaxDrawdown: round2(benchmarkMaxDrawdown),
    sharpe: round2(sharpe),
    benchmarkSharpe: round2(benchmarkSharpe),
    dcaReturn: round2(dcaReturn),
    dcaCagr: round2(dcaCagr),
    dcaMaxDrawdown: round2(dcaMaxDrawdown),
    dcaSharpe: round2(dcaSharpe),
    alphaVsDca: round2(totalReturn - dcaReturn),
  };
}

/** 最大ドローダウン（負の値で返す） */
export function computeMaxDrawdown(series: number[]): number {
  if (series.length === 0) return 0;
  let peak = series[0];
  let maxDd = 0;
  for (const v of series) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? ((v - peak) / peak) * 100 : 0;
    if (dd < maxDd) maxDd = dd;
  }
  return maxDd;
}

function computeDailyReturns(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) {
    if (series[i - 1] > 0) {
      out.push((series[i] - series[i - 1]) / series[i - 1]);
    }
  }
  return out;
}

/** リスクフリーレート 0 での年率 Sharpe（252 営業日換算） */
export function computeSharpe(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean =
    dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
    (dailyReturns.length - 1);
  const std = Math.sqrt(variance);
  if (std === 0) return 0;
  return (mean / std) * Math.sqrt(252);
}
