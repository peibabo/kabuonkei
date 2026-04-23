/**
 * VIX × 米国 (S&P500) × 日本 (日経225) 分析データ生成スクリプト。
 *
 * 入力:
 *   - Yahoo Finance: ^VIX / ^GSPC / ^N225 日足 (過去20年)
 *   - src/data/japan-temperature-history.json (2016-04-22〜、日本版温度 C1+C5)
 *
 * 出力: src/data/vix-sp500-analysis.json
 *
 * 集計:
 *   - Primary (1D): VIX バンド × {S&P500, 日経225} の 1M/3M/6M 前方リターン
 *   - Joint (2D): VIX × 日本版温度バンド × 日経225 のクロス市場集計 (2016〜)
 *   - VIX の historical quantile (p25/p50/p75/p95) + 最新値
 *
 * 実行: npm run generate:vix-sp500
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  fetchDailyCloses,
  findForwardPrice,
  getSentimentLevel,
  round1,
  sleep,
} from "./_lib/shared";
import {
  aggregateJointReturns,
  aggregateLevelReturns,
} from "./_lib/stats-aggregator";
import type { PeriodStats } from "./_lib/shared";
import type { SentimentLevel } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 20;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
type PeriodKey = keyof typeof FORWARD_DAYS;

// VIX バンド: 市場慣習 (VIX<15 落ち着き / 15-20 通常 / 20-30 警戒 / 30+ パニック)
interface VixBand {
  label: string;
  min: number;
  max: number; // exclusive
}
const VIX_BANDS: VixBand[] = [
  { label: "〜15", min: 0, max: 15 },
  { label: "15〜20", min: 15, max: 20 },
  { label: "20〜30", min: 20, max: 30 },
  { label: "30〜", min: 30, max: Infinity },
];

function classifyVix(vix: number): string | null {
  for (const b of VIX_BANDS) {
    if (vix >= b.min && vix < b.max) return b.label;
  }
  return null;
}

// --- JSON 形状 ---
interface TempHistoryFile {
  daily: Array<{ date: string; score: number }>;
}

interface PrimaryBandOutput {
  band: string;
  occurrences: number;
  sp500: Record<PeriodKey, PeriodStats>;
  nikkei225: Record<PeriodKey, PeriodStats>;
}

interface JointCellOutput {
  vixBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<PeriodKey, PeriodStats>; // 日経225 ベース
}

interface AnalysisOutput {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  vixBands: VixBand[];
  tempBands: SentimentLevel[];
  primary: { bands: PrimaryBandOutput[] };
  joint: {
    dataRange: { from: string; to: string };
    sampleSize: number;
    cells: JointCellOutput[];
  };
  vixQuantiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    latest: { date: string; vix: number };
  };
  latestContext: {
    date: string;
    vix: number;
    vixBand: string;
    jpScore: number | null;
    tempBand: SentimentLevel | null;
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

async function main() {
  console.log("=== VIX × S&P500 × 日経225 分析データ生成 ===\n");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);
  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];
  console.log(`データ取得期間: ${period1} 〜 ${period2}\n`);

  // --- 1. 価格データ ---
  console.log("取得中: ^VIX...");
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

  // --- 2. JP 温度履歴 ---
  const tempPath = resolve(__dirname, "../src/data/japan-temperature-history.json");
  const tempHist = JSON.parse(readFileSync(tempPath, "utf-8")) as TempHistoryFile;
  const tempMap = new Map<string, number>();
  for (const d of tempHist.daily) tempMap.set(d.date, d.score);
  const tempDates = [...tempMap.keys()].sort();
  console.log(`日本版温度履歴: ${tempDates.length} 日 (${tempDates[0]} 〜 ${tempDates[tempDates.length - 1]})\n`);

  // --- 3. Primary 1D: VIX バンド × (S&P500 + 日経225) ---
  // VIX と S&P500 両方が存在する日を基準日にする
  const primaryDates = vixDates.filter((d) => spMap.has(d));
  console.log(`Primary 対象: ${primaryDates.length} 取引日`);

  // VIX バンドから SentimentLevel-風の文字列マップを作って aggregateLevelReturns に流したいが、
  // VIX バンドは 4 段階で SentimentLevel (5段階) と違う。
  // → 1D は手動で返す
  const primaryReturnsSp = new Map<string, Record<PeriodKey, number[]>>();
  const primaryReturnsN225 = new Map<string, Record<PeriodKey, number[]>>();
  const primaryOcc = new Map<string, number>();
  for (const b of VIX_BANDS) {
    primaryReturnsSp.set(b.label, { "1m": [], "3m": [], "6m": [] });
    primaryReturnsN225.set(b.label, { "1m": [], "3m": [], "6m": [] });
    primaryOcc.set(b.label, 0);
  }

  for (const date of primaryDates) {
    const vix = vixMap.get(date);
    if (vix == null) continue;
    const band = classifyVix(vix);
    if (!band) continue;

    primaryOcc.set(band, (primaryOcc.get(band) ?? 0) + 1);

    const spBase = spMap.get(date);
    if (spBase != null) {
      const target = primaryReturnsSp.get(band)!;
      for (const key of Object.keys(FORWARD_DAYS) as PeriodKey[]) {
        const futurePrice = findForwardPrice(
          spMap,
          spDates,
          date,
          FORWARD_DAYS[key]
        );
        if (futurePrice != null) {
          target[key].push(((futurePrice - spBase) / spBase) * 100);
        }
      }
    }
    const nBase = n225Map.get(date);
    if (nBase != null) {
      const target = primaryReturnsN225.get(band)!;
      for (const key of Object.keys(FORWARD_DAYS) as PeriodKey[]) {
        const futurePrice = findForwardPrice(
          n225Map,
          n225Dates,
          date,
          FORWARD_DAYS[key]
        );
        if (futurePrice != null) {
          target[key].push(((futurePrice - nBase) / nBase) * 100);
        }
      }
    }
  }

  const primaryBands: PrimaryBandOutput[] = VIX_BANDS.map((b) => {
    const spRs = primaryReturnsSp.get(b.label)!;
    const nRs = primaryReturnsN225.get(b.label)!;
    return {
      band: b.label,
      occurrences: primaryOcc.get(b.label) ?? 0,
      sp500: {
        "1m": buildPeriodStats(spRs["1m"]),
        "3m": buildPeriodStats(spRs["3m"]),
        "6m": buildPeriodStats(spRs["6m"]),
      },
      nikkei225: {
        "1m": buildPeriodStats(nRs["1m"]),
        "3m": buildPeriodStats(nRs["3m"]),
        "6m": buildPeriodStats(nRs["6m"]),
      },
    };
  });

  // --- 4. Joint 2D: VIX × JP 温度 × 日経225 ---
  // temp 履歴とのオーバーラップを対象にする
  const jointOverlapFrom = tempDates[0];
  const jointDates = primaryDates.filter(
    (d) => d >= jointOverlapFrom && n225Map.has(d)
  );
  console.log(`Joint (VIX × 日本温度 × 日経225) 対象: ${jointDates.length} 取引日`);

  const bucketOf = (date: string) => {
    const vix = vixMap.get(date);
    if (vix == null) return null;
    const vband = classifyVix(vix);
    if (!vband) return null;
    // 温度スコア: 同日 or 7 日以内の直近
    let score: number | null = null;
    const target = new Date(date);
    for (let back = 0; back <= 7; back++) {
      const t = new Date(target);
      t.setDate(target.getDate() - back);
      const key = t.toISOString().split("T")[0];
      const s = tempMap.get(key);
      if (s != null) {
        score = s;
        break;
      }
    }
    if (score == null) return null;
    return { band1: vband, band2: getSentimentLevel(score) };
  };

  const jointCells = aggregateJointReturns<PeriodKey>({
    dates: jointDates,
    bucketOf,
    priceMap: n225Map,
    priceDates: n225Dates,
    forwardDays: FORWARD_DAYS,
  });

  const jointOutput: JointCellOutput[] = jointCells.map((c) => ({
    vixBand: c.band1,
    tempBand: c.band2 as SentimentLevel,
    occurrences: c.occurrences,
    returns: {
      "1m": buildPeriodStats(c.returns["1m"]),
      "3m": buildPeriodStats(c.returns["3m"]),
      "6m": buildPeriodStats(c.returns["6m"]),
    },
  }));

  // --- 5. VIX quantile + 最新 context ---
  const vixValues = vixDates
    .map((d) => vixMap.get(d)!)
    .filter((v) => v != null)
    .sort((a, b) => a - b);
  const latestDate = vixDates[vixDates.length - 1];
  const latestVix = round1(vixMap.get(latestDate) ?? 0);

  const vixQuantiles = {
    p25: quantile(vixValues, 0.25),
    p50: quantile(vixValues, 0.5),
    p75: quantile(vixValues, 0.75),
    p95: quantile(vixValues, 0.95),
    latest: { date: latestDate, vix: latestVix },
  };

  // 最新 JP 温度
  let latestJpScore: number | null = null;
  {
    const t = new Date(latestDate);
    for (let back = 0; back <= 7; back++) {
      const d = new Date(t);
      d.setDate(t.getDate() - back);
      const key = d.toISOString().split("T")[0];
      const s = tempMap.get(key);
      if (s != null) {
        latestJpScore = s;
        break;
      }
    }
  }

  const latestContext = {
    date: latestDate,
    vix: latestVix,
    vixBand: classifyVix(latestVix) ?? "—",
    jpScore: latestJpScore,
    tempBand: latestJpScore != null ? getSentimentLevel(latestJpScore) : null,
  };

  // --- 6. 出力 ---
  const output: AnalysisOutput = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: primaryDates[0],
      to: primaryDates[primaryDates.length - 1],
    },
    sampleSize: primaryDates.length,
    vixBands: VIX_BANDS,
    tempBands: SENTIMENT_RANGES.map((r) => r.level),
    primary: { bands: primaryBands },
    joint: {
      dataRange: {
        from: jointDates[0] ?? jointOverlapFrom,
        to: jointDates[jointDates.length - 1] ?? latestDate,
      },
      sampleSize: jointDates.length,
      cells: jointOutput,
    },
    vixQuantiles,
    latestContext,
    note:
      "Primary は VIX 終値 × S&P500/日経225 終値の同日基準、JST 換算で前方 30/90/180 カレンダー日後の終値比較。" +
      "Joint は 2016 年以降に日本版株温計 (C1+C5 簡易) スコアが計算できる期間を対象に、VIX バンド × 日本版温度帯 ごとに日経225 の前方リターンをクロス集計。" +
      "^VIX は米国のセンチメント指標、日本版温度は独立した需給ベースなので、同時水準の組合せ効果を見ることができる。",
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "vix-sp500-analysis.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(`\n--- Primary 集計 (VIX バンド別 3ヶ月後) ---`);
  for (const b of primaryBands) {
    const s = b.sp500["3m"];
    const n = b.nikkei225["3m"];
    console.log(
      `  VIX ${b.band.padEnd(8)} (n=${String(b.occurrences).padStart(4)}): ` +
        `S&P500 平均 ${s.avgReturn >= 0 ? "+" : ""}${s.avgReturn}% 勝率 ${s.winRate}% | ` +
        `日経225 平均 ${n.avgReturn >= 0 ? "+" : ""}${n.avgReturn}% 勝率 ${n.winRate}%`
    );
  }
  console.log(
    `\n--- VIX quantile: p25=${vixQuantiles.p25} / p50=${vixQuantiles.p50} / p75=${vixQuantiles.p75} / p95=${vixQuantiles.p95} | latest=${vixQuantiles.latest.vix}`
  );
  console.log(`\n--- Joint cells: ${jointOutput.length} 件 (overlap ${output.joint.sampleSize} 日)`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
