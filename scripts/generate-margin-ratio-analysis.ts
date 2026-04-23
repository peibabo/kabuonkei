/**
 * 信用倍率 × 株温計 × 日経225 の過去分析データ生成スクリプト。
 *
 * 入力:
 *   - src/data/margin-ratio-history.json (2002〜週次)
 *   - src/data/japan-temperature-history.json (2016-04-22〜日次、C1+C5 簡易スコア)
 *   - ^N225 日次終値（Yahoo Finance、上記と重なる期間）
 *
 * 出力: src/data/margin-ratio-analysis.json
 *
 * 集計:
 *   - 信用倍率バンド × 温度バンド の 2D ジョイントセル
 *   - 信用倍率バンド別の 1D マージナル
 *   - 温度バンド別の 1D マージナル
 *   - 信用倍率の分布 quartile (p25/p50/p75/p95) + latest
 *
 * 実行: npm run generate:margin-analysis
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  fetchDailyCloses,
  getSentimentLevel,
  round1,
} from "./_lib/shared";
import {
  aggregateJointReturns,
  aggregateLevelReturns,
} from "./_lib/stats-aggregator";
import type { PeriodStats } from "./_lib/shared";
import type {
  MarginTradingWeek,
  MarginTradingData,
} from "../src/lib/types/japan-market";
import type { SentimentLevel } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
type PeriodKey = keyof typeof FORWARD_DAYS;

// --- 信用倍率バンド定義 ---
interface RatioBand {
  label: string;
  min: number;
  max: number; // exclusive
}
// バンド境界は過去10年 (2016-) の信用倍率分布 (p25≈2.8 / p50≈3.9 / p75≈4.8) に基づき、
// 読みやすさ優先で 3 / 4 / 5 の丸め値に合わせた。低倍率（売残優勢）は 2016-以降でほぼ
// 出現しないため「〜3倍」でまとめる。
const RATIO_BANDS: RatioBand[] = [
  { label: "〜3倍", min: 0, max: 3.0 },
  { label: "3〜4倍", min: 3.0, max: 4.0 },
  { label: "4〜5倍", min: 4.0, max: 5.0 },
  { label: "5倍〜", min: 5.0, max: Infinity },
];

function classifyRatio(ratio: number): string | null {
  for (const b of RATIO_BANDS) {
    if (ratio >= b.min && ratio < b.max) return b.label;
  }
  return null;
}

// --- I/O 型 ---
interface HistoryFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  weekly: MarginTradingWeek[];
}

interface TempHistoryFile {
  daily: Array<{ date: string; score: number }>;
}

interface AnalysisCellOutput {
  ratioBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<PeriodKey, PeriodStats>;
}

interface MarginalBandOutput {
  band: string;
  occurrences: number;
  returns: Record<PeriodKey, PeriodStats>;
}

interface AnalysisOutput {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  ratioBands: RatioBand[];
  tempBands: SentimentLevel[];
  joint: AnalysisCellOutput[];
  marginalRatio: MarginalBandOutput[];
  marginalTemp: MarginalBandOutput[];
  ratioQuartiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    latest: { date: string; ratio: number };
  };
  latestContext: {
    date: string;
    ratio: number;
    ratioBand: string;
    score: number | null;
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

/** 指定日以前の最新取引日の終値を返す (最大 7 日遡る) */
function findCloseOnOrBefore(
  priceMap: Map<string, number>,
  sortedDates: string[],
  targetDate: string,
  maxDaysBack = 7
): { date: string; price: number } | null {
  // binary search or linear scan — dataset is ~3000 dates, linear is fine
  let idx = -1;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] <= targetDate) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const candidate = sortedDates[idx];
  const daysDiff =
    (new Date(targetDate).getTime() - new Date(candidate).getTime()) /
    (1000 * 60 * 60 * 24);
  if (daysDiff > maxDaysBack) return null;
  const price = priceMap.get(candidate);
  if (price == null) return null;
  return { date: candidate, price };
}

async function main() {
  console.log("=== 信用倍率 × 株温計 分析データ生成 ===\n");

  // --- 1. 信用倍率履歴 ---
  const historyPath = resolve(__dirname, "../src/data/margin-ratio-history.json");
  const history = JSON.parse(readFileSync(historyPath, "utf-8")) as HistoryFile;
  console.log(`信用倍率履歴: ${history.weekly.length} 週 (${history.dataRange.from} 〜 ${history.dataRange.to})`);

  // --- 2. 温度履歴 ---
  const tempPath = resolve(__dirname, "../src/data/japan-temperature-history.json");
  const tempHist = JSON.parse(readFileSync(tempPath, "utf-8")) as TempHistoryFile;
  const tempMap = new Map<string, number>();
  for (const d of tempHist.daily) tempMap.set(d.date, d.score);
  const tempDates = [...tempMap.keys()].sort();
  console.log(`温度履歴: ${tempDates.length} 日 (${tempDates[0]} 〜 ${tempDates[tempDates.length - 1]})`);

  // オーバーラップ期間の起点
  const overlapFrom = tempDates[0];
  const eligibleWeeks = history.weekly.filter((w) => w.date >= overlapFrom);
  console.log(`オーバーラップ対象: ${eligibleWeeks.length} 週\n`);

  // --- 3. ^N225 日次終値 ---
  const n225From = overlapFrom;
  // 6ヶ月先まで必要なので今日まで fetch (最終週の 6m forward のため)
  const n225To = new Date().toISOString().split("T")[0];
  console.log(`取得中: ^N225 (${n225From} 〜 ${n225To})...`);
  const n225Map = await fetchDailyCloses(yahooFinance, "^N225", n225From, n225To);
  const n225Dates = [...n225Map.keys()].sort();
  console.log(`  → ${n225Map.size} 日分取得\n`);

  // --- 4. 各週次エントリを基準日として temp/price を lookup ---
  type EnrichedWeek = {
    date: string;
    baseDate: string; // 実際に使う基準日 (申込日 or 直近取引日)
    ratio: number;
    score: number;
    basePrice: number;
    ratioBand: string;
    tempBand: SentimentLevel;
  };

  const enriched: EnrichedWeek[] = [];
  let skipNoTemp = 0;
  let skipNoPrice = 0;
  let skipNoRatioBand = 0;
  for (const w of eligibleWeeks) {
    const ratioBand = classifyRatio(w.ratio);
    if (!ratioBand) {
      skipNoRatioBand++;
      continue;
    }
    // 温度スコア: 申込日 or その前 7 日以内の最新
    // 簡易: tempMap に直接の日付があればそれ、無ければ 1 日ずつ遡る
    let score: number | null = null;
    const target = new Date(w.date);
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
    if (score == null) {
      skipNoTemp++;
      continue;
    }
    const priceInfo = findCloseOnOrBefore(n225Map, n225Dates, w.date);
    if (!priceInfo) {
      skipNoPrice++;
      continue;
    }
    enriched.push({
      date: w.date,
      baseDate: priceInfo.date,
      ratio: w.ratio,
      score,
      basePrice: priceInfo.price,
      ratioBand,
      tempBand: getSentimentLevel(score),
    });
  }

  console.log(`拡充後: ${enriched.length} 週 (temp欠損${skipNoTemp} / 価格欠損${skipNoPrice} / 比率範囲外${skipNoRatioBand})`);

  // --- 5. 集計のための価格マップ拡張 (base date + forward dates) ---
  // aggregateJointReturns は priceMap.get(date) == basePrice を期待する。
  // ここでは bucketOf でカスタムルックアップを行い、前後で rich マップを持たせる工夫をする。
  //
  // 簡易実装: enriched の baseDate 単位で aggregate する。baseDate が既に N225 取引日なので、
  // basePrice は n225Map.get(baseDate) で取れる。
  const enrichedByBaseDate = new Map<string, EnrichedWeek>();
  for (const e of enriched) {
    // 同じ baseDate に複数週が当たる場合は、最新の (date) を採用（通常は happen しない）
    const prev = enrichedByBaseDate.get(e.baseDate);
    if (!prev || e.date > prev.date) enrichedByBaseDate.set(e.baseDate, e);
  }
  const joinedDates = [...enrichedByBaseDate.keys()].sort();

  const bucketOf = (date: string) => {
    const e = enrichedByBaseDate.get(date);
    if (!e) return null;
    return { band1: e.ratioBand, band2: e.tempBand };
  };
  const scoreOf = (date: string) => enrichedByBaseDate.get(date)?.score ?? null;

  // --- 6. Joint 集計 ---
  const joint2D = aggregateJointReturns<PeriodKey>({
    dates: joinedDates,
    bucketOf,
    priceMap: n225Map,
    priceDates: n225Dates,
    forwardDays: FORWARD_DAYS,
  });
  console.log(`\n2D セル: ${joint2D.length} 件`);

  const jointOutput: AnalysisCellOutput[] = joint2D.map((cell) => ({
    ratioBand: cell.band1,
    tempBand: cell.band2 as SentimentLevel,
    occurrences: cell.occurrences,
    returns: {
      "1m": buildPeriodStats(cell.returns["1m"]),
      "3m": buildPeriodStats(cell.returns["3m"]),
      "6m": buildPeriodStats(cell.returns["6m"]),
    },
  }));

  // --- 7. 温度バンドマージナル (既存 aggregateLevelReturns を再利用) ---
  const tempAggregated = aggregateLevelReturns<PeriodKey>({
    dates: joinedDates,
    scoreOf,
    priceMap: n225Map,
    priceDates: n225Dates,
    forwardDays: FORWARD_DAYS,
  });
  const marginalTemp: MarginalBandOutput[] = SENTIMENT_RANGES.map(({ level }) => ({
    band: level,
    occurrences: tempAggregated[level].occurrences,
    returns: {
      "1m": buildPeriodStats(tempAggregated[level].returns["1m"]),
      "3m": buildPeriodStats(tempAggregated[level].returns["3m"]),
      "6m": buildPeriodStats(tempAggregated[level].returns["6m"]),
    },
  }));

  // --- 8. 信用倍率バンドマージナル ---
  const ratioReturnsByBand = new Map<string, Record<PeriodKey, number[]>>();
  for (const b of RATIO_BANDS) {
    ratioReturnsByBand.set(b.label, { "1m": [], "3m": [], "6m": [] });
  }
  const ratioOccByBand = new Map<string, number>();
  for (const b of RATIO_BANDS) ratioOccByBand.set(b.label, 0);

  for (const cell of joint2D) {
    const target = ratioReturnsByBand.get(cell.band1);
    if (!target) continue;
    for (const k of Object.keys(FORWARD_DAYS) as PeriodKey[]) {
      target[k].push(...cell.returns[k]);
    }
    ratioOccByBand.set(
      cell.band1,
      (ratioOccByBand.get(cell.band1) ?? 0) + cell.occurrences
    );
  }
  const marginalRatio: MarginalBandOutput[] = RATIO_BANDS.map((b) => {
    const rs = ratioReturnsByBand.get(b.label)!;
    return {
      band: b.label,
      occurrences: ratioOccByBand.get(b.label) ?? 0,
      returns: {
        "1m": buildPeriodStats(rs["1m"]),
        "3m": buildPeriodStats(rs["3m"]),
        "6m": buildPeriodStats(rs["6m"]),
      },
    };
  });

  // --- 9. 比率 quartile + latest ---
  const ratiosSorted = eligibleWeeks.map((w) => w.ratio).sort((a, b) => a - b);
  const latestWeek = history.weekly[history.weekly.length - 1];
  const ratioQuartiles = {
    p25: quantile(ratiosSorted, 0.25),
    p50: quantile(ratiosSorted, 0.5),
    p75: quantile(ratiosSorted, 0.75),
    p95: quantile(ratiosSorted, 0.95),
    latest: { date: latestWeek.date, ratio: latestWeek.ratio },
  };

  // --- 10. latest context (dynamic boost 用) ---
  const latestEnriched = enriched[enriched.length - 1];
  const latestContext = {
    date: latestWeek.date,
    ratio: latestWeek.ratio,
    ratioBand: classifyRatio(latestWeek.ratio) ?? "—",
    score: latestEnriched?.score ?? null,
    tempBand: latestEnriched?.tempBand ?? null,
  };

  // --- 11. 出力 ---
  const output: AnalysisOutput = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: enriched[0]?.date ?? overlapFrom,
      to: enriched[enriched.length - 1]?.date ?? latestWeek.date,
    },
    sampleSize: enriched.length,
    ratioBands: RATIO_BANDS,
    tempBands: SENTIMENT_RANGES.map((r) => r.level),
    joint: jointOutput,
    marginalRatio,
    marginalTemp,
    ratioQuartiles,
    latestContext,
    note:
      "各週次の信用倍率 (JPX 公表の 二市場計 合計) を申込日 (金曜) の温度スコア (C1+C5 簡易版) と " +
      "対応する日経225 終値に結合。将来リターンは申込日終値から 30/90/180 カレンダー日先の ^N225 終値で計算。" +
      "読者が実際に行動するまでには JPX 公表までの T+3〜5 営業日ほどのラグがあるが、1 ヶ月以上の horizon では影響は小さい。",
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "margin-ratio-analysis.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(`\n--- サマリー ---`);
  console.log(`期間: ${output.dataRange.from} 〜 ${output.dataRange.to} | ${output.sampleSize} 週`);
  console.log(`ratio quartiles: p25=${ratioQuartiles.p25} / p50=${ratioQuartiles.p50} / p75=${ratioQuartiles.p75} / p95=${ratioQuartiles.p95} | latest=${ratioQuartiles.latest.ratio}`);
  console.log(`\n信用倍率バンド別 3ヶ月後:`);
  for (const m of marginalRatio) {
    const s = m.returns["3m"];
    console.log(
      `  ${m.band.padEnd(12)}: n=${String(m.occurrences).padStart(3)} | 平均 ${s.avgReturn >= 0 ? "+" : ""}${s.avgReturn}% | 勝率 ${s.winRate}%`
    );
  }
  console.log(`\n温度バンド別 3ヶ月後:`);
  for (const m of marginalTemp) {
    const s = m.returns["3m"];
    console.log(
      `  ${m.band.padEnd(8)}: n=${String(m.occurrences).padStart(3)} | 平均 ${s.avgReturn >= 0 ? "+" : ""}${s.avgReturn}% | 勝率 ${s.winRate}%`
    );
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
