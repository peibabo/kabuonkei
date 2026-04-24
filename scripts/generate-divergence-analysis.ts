/**
 * 日米温度乖離 (gap = JP score - US score) × 将来リターン分析データ生成スクリプト。
 *
 * 入力:
 *   - Yahoo Finance: ^VIX / ^GSPC / ^N225 日足 (過去20年)
 *   - src/data/japan-temperature-history.json (2016-10〜、日本版温度 C1+C5)
 *   - 米国版温度は VIX → estimateFearGreedFromVix() で再構成
 *
 * 出力: src/data/divergence-analysis.json
 *
 * 集計:
 *   - Primary (1D): 乖離バンド × {S&P500, 日経225} の 1M/3M/6M 前方リターン
 *                   + N225 - S&P500 スプレッド (収斂/発散の動き)
 *   - Joint (2D): 乖離バンド × 日本版温度バンド × 日経225 の前方リターン
 *   - 乖離 quantile (p10/p25/p50/p75/p90) + 最新値
 *
 * 実行: npm run generate:divergence
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  estimateFearGreedFromVix,
  fetchDailyCloses,
  findForwardPrice,
  getSentimentLevel,
  round1,
  sleep,
} from "./_lib/shared";
import { aggregateJointReturns } from "./_lib/stats-aggregator";
import type { PeriodStats } from "./_lib/shared";
import type { SentimentLevel } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 20;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
type PeriodKey = keyof typeof FORWARD_DAYS;

// 乖離バンド: JP score - US score (正 = 日本が相対的に熱い)
// JSON では ±Infinity が null になってしまうため、温度差は理論上 -100〜+100
// に収まることを利用して sentinel 値 (-999 / 999) を使う。
interface GapBand {
  label: string;
  min: number; // inclusive
  max: number; // exclusive
}
const GAP_MIN_SENTINEL = -999;
const GAP_MAX_SENTINEL = 999;
const GAP_BANDS: GapBand[] = [
  { label: "米国が大幅優位 (≤ -20)", min: GAP_MIN_SENTINEL, max: -20 },
  { label: "米国がやや優位 (-20〜-10)", min: -20, max: -10 },
  { label: "ほぼ同温 (-10〜+10)", min: -10, max: 10 },
  { label: "日本がやや優位 (+10〜+20)", min: 10, max: 20 },
  { label: "日本が大幅優位 (≥ +20)", min: 20, max: GAP_MAX_SENTINEL },
];

function classifyGap(gap: number): string | null {
  for (const b of GAP_BANDS) {
    if (gap >= b.min && gap < b.max) return b.label;
  }
  return null;
}

interface TempHistoryFile {
  daily: Array<{ date: string; score: number }>;
}

interface PrimaryBandOutput {
  band: string;
  occurrences: number;
  sp500: Record<PeriodKey, PeriodStats>;
  nikkei225: Record<PeriodKey, PeriodStats>;
  /** 日経225 平均 - S&P500 平均 (相対パフォーマンス) */
  spread: Record<PeriodKey, number>;
}

interface JointCellOutput {
  gapBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<PeriodKey, PeriodStats>; // 日経225 ベース
}

interface AnalysisOutput {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  gapBands: GapBand[];
  tempBands: SentimentLevel[];
  primary: { bands: PrimaryBandOutput[] };
  joint: {
    dataRange: { from: string; to: string };
    sampleSize: number;
    cells: JointCellOutput[];
  };
  gapQuantiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    latest: { date: string; gap: number };
  };
  latestContext: {
    date: string;
    jpScore: number;
    usScore: number;
    vix: number;
    gap: number;
    gapBand: string;
    jpTempBand: SentimentLevel;
  };
  note: string;
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return round1(sorted[base] + rest * (sorted[base + 1] - sorted[base]));
  }
  return round1(sorted[base]);
}

/** 指定日もしくは 7 日以内の直近営業日のスコアを返す */
function findRecentScore(
  scoreMap: Map<string, number>,
  date: string
): number | null {
  const target = new Date(date);
  for (let back = 0; back <= 7; back++) {
    const t = new Date(target);
    t.setDate(target.getDate() - back);
    const key = t.toISOString().split("T")[0];
    const s = scoreMap.get(key);
    if (s != null) return s;
  }
  return null;
}

async function main() {
  console.log("=== 日米温度乖離 × 将来リターン 分析データ生成 ===\n");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);
  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];
  console.log(`データ取得期間: ${period1} 〜 ${period2}\n`);

  console.log("取得中: ^VIX (米国版温度の元データ)...");
  const vixMap = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);
  console.log(`  → ${vixMap.size} 日分取得`);
  await sleep(1500);

  console.log("取得中: ^GSPC (S&P500)...");
  const spMap = await fetchDailyCloses(yahooFinance, "^GSPC", period1, period2);
  console.log(`  → ${spMap.size} 日分取得`);
  await sleep(1500);

  console.log("取得中: ^N225 (日経225)...");
  const n225Map = await fetchDailyCloses(yahooFinance, "^N225", period1, period2);
  console.log(`  → ${n225Map.size} 日分取得\n`);

  const vixDates = [...vixMap.keys()].sort();
  const spDates = [...spMap.keys()].sort();
  const n225Dates = [...n225Map.keys()].sort();

  // 米国版温度 = VIX → estimateFearGreedFromVix
  const usScoreMap = new Map<string, number>();
  for (const [d, vix] of vixMap.entries()) {
    usScoreMap.set(d, estimateFearGreedFromVix(vix));
  }

  // 日本版温度履歴
  const tempPath = resolve(__dirname, "../src/data/japan-temperature-history.json");
  const jpHist = JSON.parse(readFileSync(tempPath, "utf-8")) as TempHistoryFile;
  const jpScoreMap = new Map<string, number>();
  for (const d of jpHist.daily) jpScoreMap.set(d.date, d.score);
  const jpDates = [...jpScoreMap.keys()].sort();
  console.log(
    `日本版温度履歴: ${jpDates.length} 日 (${jpDates[0]} 〜 ${jpDates[jpDates.length - 1]})\n`
  );

  // 集計対象: VIX (US trading day) を anchor、JP score を 7 日 backward fill で補完
  // JP temperature 履歴の開始日以降に絞る (オーバーラップ)
  const overlapFrom = jpDates[0];
  const targetDates = vixDates.filter((d) => d >= overlapFrom);
  console.log(`集計対象: ${targetDates.length} 取引日 (オーバーラップ ${overlapFrom} 以降)\n`);

  // --- Primary 1D: 乖離バンド × {N225, S&P500} ---
  const primaryReturnsSp = new Map<string, Record<PeriodKey, number[]>>();
  const primaryReturnsN = new Map<string, Record<PeriodKey, number[]>>();
  const primaryOcc = new Map<string, number>();
  for (const b of GAP_BANDS) {
    primaryReturnsSp.set(b.label, { "1m": [], "3m": [], "6m": [] });
    primaryReturnsN.set(b.label, { "1m": [], "3m": [], "6m": [] });
    primaryOcc.set(b.label, 0);
  }

  let validSamples = 0;
  for (const date of targetDates) {
    const us = usScoreMap.get(date);
    if (us == null) continue;
    const jp = findRecentScore(jpScoreMap, date);
    if (jp == null) continue;

    const gap = jp - us;
    const band = classifyGap(gap);
    if (!band) continue;

    primaryOcc.set(band, (primaryOcc.get(band) ?? 0) + 1);
    validSamples++;

    const spBase = spMap.get(date);
    if (spBase != null) {
      const t = primaryReturnsSp.get(band)!;
      for (const key of Object.keys(FORWARD_DAYS) as PeriodKey[]) {
        const fp = findForwardPrice(spMap, spDates, date, FORWARD_DAYS[key]);
        if (fp != null) t[key].push(((fp - spBase) / spBase) * 100);
      }
    }

    const nBase = n225Map.get(date);
    if (nBase != null) {
      const t = primaryReturnsN.get(band)!;
      for (const key of Object.keys(FORWARD_DAYS) as PeriodKey[]) {
        const fp = findForwardPrice(n225Map, n225Dates, date, FORWARD_DAYS[key]);
        if (fp != null) t[key].push(((fp - nBase) / nBase) * 100);
      }
    }
  }

  const primaryBands: PrimaryBandOutput[] = GAP_BANDS.map((b) => {
    const sp = primaryReturnsSp.get(b.label)!;
    const n = primaryReturnsN.get(b.label)!;
    const spStats = {
      "1m": buildPeriodStats(sp["1m"]),
      "3m": buildPeriodStats(sp["3m"]),
      "6m": buildPeriodStats(sp["6m"]),
    };
    const nStats = {
      "1m": buildPeriodStats(n["1m"]),
      "3m": buildPeriodStats(n["3m"]),
      "6m": buildPeriodStats(n["6m"]),
    };
    return {
      band: b.label,
      occurrences: primaryOcc.get(b.label) ?? 0,
      sp500: spStats,
      nikkei225: nStats,
      spread: {
        "1m": round1(nStats["1m"].avgReturn - spStats["1m"].avgReturn),
        "3m": round1(nStats["3m"].avgReturn - spStats["3m"].avgReturn),
        "6m": round1(nStats["6m"].avgReturn - spStats["6m"].avgReturn),
      },
    };
  });

  // --- Joint 2D: 乖離バンド × JP 温度バンド × 日経225 ---
  const bucketOf = (date: string) => {
    const us = usScoreMap.get(date);
    if (us == null) return null;
    const jp = findRecentScore(jpScoreMap, date);
    if (jp == null) return null;
    const gap = jp - us;
    const gband = classifyGap(gap);
    if (!gband) return null;
    return { band1: gband, band2: getSentimentLevel(jp) };
  };

  const jointDates = targetDates.filter((d) => n225Map.has(d));
  const jointCells = aggregateJointReturns<PeriodKey>({
    dates: jointDates,
    bucketOf,
    priceMap: n225Map,
    priceDates: n225Dates,
    forwardDays: FORWARD_DAYS,
  });

  const jointOutput: JointCellOutput[] = jointCells.map((c) => ({
    gapBand: c.band1,
    tempBand: c.band2 as SentimentLevel,
    occurrences: c.occurrences,
    returns: {
      "1m": buildPeriodStats(c.returns["1m"]),
      "3m": buildPeriodStats(c.returns["3m"]),
      "6m": buildPeriodStats(c.returns["6m"]),
    },
  }));

  // --- 乖離 quantile + 最新 context ---
  const allGaps: number[] = [];
  for (const d of targetDates) {
    const us = usScoreMap.get(d);
    if (us == null) continue;
    const jp = findRecentScore(jpScoreMap, d);
    if (jp == null) continue;
    allGaps.push(jp - us);
  }
  const sortedGaps = [...allGaps].sort((a, b) => a - b);

  // 最新: 直近 VIX 日付で JP score も解決できる日
  let latestDate = "";
  let latestUs = 0;
  let latestJp = 0;
  let latestVix = 0;
  for (let i = vixDates.length - 1; i >= 0; i--) {
    const d = vixDates[i];
    const us = usScoreMap.get(d);
    const jp = findRecentScore(jpScoreMap, d);
    const v = vixMap.get(d);
    if (us != null && jp != null && v != null) {
      latestDate = d;
      latestUs = us;
      latestJp = jp;
      latestVix = round1(v);
      break;
    }
  }
  const latestGap = latestJp - latestUs;
  const latestGapBand = classifyGap(latestGap) ?? "—";

  const gapQuantiles = {
    p10: quantile(sortedGaps, 0.1),
    p25: quantile(sortedGaps, 0.25),
    p50: quantile(sortedGaps, 0.5),
    p75: quantile(sortedGaps, 0.75),
    p90: quantile(sortedGaps, 0.9),
    latest: { date: latestDate, gap: round1(latestGap) },
  };

  const latestContext = {
    date: latestDate,
    jpScore: latestJp,
    usScore: latestUs,
    vix: latestVix,
    gap: round1(latestGap),
    gapBand: latestGapBand,
    jpTempBand: getSentimentLevel(latestJp),
  };

  const fromDate = targetDates.find((d) => {
    const us = usScoreMap.get(d);
    if (us == null) return false;
    const jp = findRecentScore(jpScoreMap, d);
    return jp != null;
  });

  const output: AnalysisOutput = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: fromDate ?? overlapFrom,
      to: latestDate,
    },
    sampleSize: validSamples,
    gapBands: GAP_BANDS,
    tempBands: SENTIMENT_RANGES.map((r) => r.level),
    primary: { bands: primaryBands },
    joint: {
      dataRange: {
        from: jointDates[0] ?? overlapFrom,
        to: jointDates[jointDates.length - 1] ?? latestDate,
      },
      sampleSize: jointDates.length,
      cells: jointOutput,
    },
    gapQuantiles,
    latestContext,
    note:
      "日本版株温計スコア (C1+C5 簡易) と米国版温度スコア (VIX 由来) の差 (gap = JP - US) を、" +
      "両指標が計算できる 2016 年以降の米国取引日基準で算出。" +
      "Primary は乖離バンド × {S&P500, 日経225} の 1M/3M/6M 前方リターン (および N225-S&P500 平均スプレッド)、" +
      "Joint は乖離バンド × 日本版温度バンド × 日経225 のクロス集計。" +
      "正の gap = 日本が相対的に熱い、負の gap = 米国が相対的に熱い。",
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "divergence-analysis.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(`\n--- Primary 集計 (乖離バンド別 3ヶ月後) ---`);
  for (const b of primaryBands) {
    const s = b.sp500["3m"];
    const n = b.nikkei225["3m"];
    console.log(
      `  ${b.band.padEnd(28)} (n=${String(b.occurrences).padStart(4)}): ` +
        `S&P500 ${s.avgReturn >= 0 ? "+" : ""}${s.avgReturn}% (勝率${s.winRate}%) | ` +
        `日経225 ${n.avgReturn >= 0 ? "+" : ""}${n.avgReturn}% (勝率${n.winRate}%) | ` +
        `スプレッド ${b.spread["3m"] >= 0 ? "+" : ""}${b.spread["3m"]}pp`
    );
  }
  console.log(
    `\n--- Gap quantile: p10=${gapQuantiles.p10} / p25=${gapQuantiles.p25} / p50=${gapQuantiles.p50} / p75=${gapQuantiles.p75} / p90=${gapQuantiles.p90} | latest=${gapQuantiles.latest.gap}`
  );
  console.log(
    `--- 最新 (${latestDate}): JP ${latestJp} / US ${latestUs} (VIX ${latestVix}) → 乖離 ${latestGap >= 0 ? "+" : ""}${round1(latestGap)} (${latestGapBand})`
  );
  console.log(`--- Joint cells: ${jointOutput.length} 件 (overlap ${output.joint.sampleSize} 日)`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
