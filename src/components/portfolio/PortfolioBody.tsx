"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type {
  PortfolioCashYieldScenario,
  PortfolioHistory,
  PortfolioMarket,
  PortfolioSection,
} from "@/lib/portfolio";
import { slicePortfolioDailyByDays } from "@/lib/portfolio";
import { getSentimentColor } from "@/lib/sentiment";
import { returnColorClass } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import { formatXAxisDate } from "@/components/_trend/formatXAxisDate";
import InvestingBooksCTA from "@/components/analysis/InvestingBooksCTA";

type PortfolioPeriod = "1Y" | "5Y" | "10Y";
const PERIODS: readonly PortfolioPeriod[] = ["1Y", "5Y", "10Y"];
const PERIOD_LABELS: Record<PortfolioPeriod, string> = {
  "1Y": "1年",
  "5Y": "5年",
  "10Y": "10年",
};
const PERIOD_DAYS: Record<PortfolioPeriod, number> = {
  "1Y": 365,
  "5Y": 1826,
  "10Y": 3652,
};

const MARKET_LABEL: Record<PortfolioMarket, string> = {
  jp: "🇯🇵 日本（日経225 × 日本温度）",
  us: "🇺🇸 米国（S&P500 × 米国温度）",
};

interface Props {
  history: PortfolioHistory;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      date: string;
      nav: number;
      benchmark: number;
      benchmarkDca?: number;
      equityRatio: number;
      score: number | null;
    };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const scoreLabel =
    d.score != null ? (
      <span style={{ color: getSentimentColor(d.score) }}>
        {d.score} 点
      </span>
    ) : (
      <span className="text-gray-400">—</span>
    );
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs">
      <p className="text-gray-500 mb-1">{d.date}</p>
      <p>
        <span className="text-gray-500">温度ルール</span>{" "}
        <span className="font-semibold">{d.nav.toFixed(1)}</span>
      </p>
      <p>
        <span className="text-gray-500">一括買い持ち</span>{" "}
        <span className="font-semibold">{d.benchmark.toFixed(1)}</span>
      </p>
      {d.benchmarkDca != null && (
        <p>
          <span className="text-gray-500">月次積立</span>{" "}
          <span className="font-semibold">{d.benchmarkDca.toFixed(1)}</span>
        </p>
      )}
      <p>
        <span className="text-gray-500">株比率</span>{" "}
        <span className="font-semibold">
          {(d.equityRatio * 100).toFixed(0)}%
        </span>
      </p>
      <p>
        <span className="text-gray-500">温度</span> {scoreLabel}
      </p>
    </div>
  );
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function AllocationBar({ equityRatio }: { equityRatio: number }) {
  const equityPct = Math.max(0, Math.min(1, equityRatio)) * 100;
  return (
    <div className="w-full rounded-full bg-gray-100 overflow-hidden h-4 flex text-[10px] font-medium">
      <div
        className="bg-red-500 text-white flex items-center justify-center"
        style={{ width: `${equityPct}%` }}
      >
        {equityPct >= 15 ? `株 ${equityPct.toFixed(0)}%` : ""}
      </div>
      <div
        className="bg-gray-400 text-white flex items-center justify-center"
        style={{ width: `${100 - equityPct}%` }}
      >
        {100 - equityPct >= 15 ? `現金 ${(100 - equityPct).toFixed(0)}%` : ""}
      </div>
    </div>
  );
}

function StatsTable({ section }: { section: PortfolioSection }) {
  const s = section.stats;
  const ddVsDca = s.maxDrawdown - s.dcaMaxDrawdown;
  const cagrVsDca = s.cagr - s.dcaCagr;
  const sharpeVsDca = s.sharpe - s.dcaSharpe;
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[680px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">
              指標
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              温度ルール
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              一括買い持ち
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              月次積立（NISA 積立型）
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              温度 vs 積立
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
          <tr>
            <td className="text-gray-600">累計リターン</td>
            <td
              className={`text-right font-mono ${returnColorClass(s.totalReturn)}`}
            >
              {formatPct(s.totalReturn)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(s.benchmarkReturn)}`}
            >
              {formatPct(s.benchmarkReturn)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(s.dcaReturn)}`}
            >
              {formatPct(s.dcaReturn)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(s.alphaVsDca)}`}
            >
              {formatPct(s.alphaVsDca)} pp
            </td>
          </tr>
          <tr>
            <td className="text-gray-600">CAGR（年率）</td>
            <td className={`text-right font-mono ${returnColorClass(s.cagr)}`}>
              {formatPct(s.cagr)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(s.benchmarkCagr)}`}
            >
              {formatPct(s.benchmarkCagr)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(s.dcaCagr)}`}
            >
              {formatPct(s.dcaCagr)}
            </td>
            <td
              className={`text-right font-mono ${returnColorClass(cagrVsDca)}`}
            >
              {formatPct(cagrVsDca)} pp
            </td>
          </tr>
          <tr>
            <td className="text-gray-600">最大ドローダウン</td>
            <td className="text-right font-mono text-green-600">
              {s.maxDrawdown.toFixed(2)}%
            </td>
            <td className="text-right font-mono text-green-600">
              {s.benchmarkMaxDrawdown.toFixed(2)}%
            </td>
            <td className="text-right font-mono text-green-600">
              {s.dcaMaxDrawdown.toFixed(2)}%
            </td>
            <td
              className={`text-right font-mono ${
                ddVsDca >= 0 ? "text-red-500" : "text-green-600"
              }`}
            >
              {ddVsDca >= 0 ? "+" : ""}
              {ddVsDca.toFixed(2)} pp
            </td>
          </tr>
          <tr>
            <td className="text-gray-600">Sharpe（年率）</td>
            <td className="text-right font-mono">{s.sharpe.toFixed(2)}</td>
            <td className="text-right font-mono">
              {s.benchmarkSharpe.toFixed(2)}
            </td>
            <td className="text-right font-mono">{s.dcaSharpe.toFixed(2)}</td>
            <td
              className={`text-right font-mono ${
                sharpeVsDca >= 0 ? "text-red-500" : "text-green-600"
              }`}
            >
              {sharpeVsDca >= 0 ? "+" : ""}
              {sharpeVsDca.toFixed(2)}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
        <strong>月次積立（DCA）</strong>: 初期 100 を N ヶ月で等額按分し、毎月第一営業日にその月分を株へ投入（NISA 積立投資の典型パターンを模擬）。
        累計で 100 を全額投入する点で、他 2 戦略と元手を揃えて比較できます。
      </p>
    </div>
  );
}

function CashYieldSensitivityTable({
  scenarios,
  benchmarkCagr,
  benchmarkSharpe,
}: {
  scenarios: PortfolioCashYieldScenario[];
  benchmarkCagr: number;
  benchmarkSharpe: number;
}) {
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[520px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-700">
              現金金利シナリオ
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              累計
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              CAGR
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              α
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              Sharpe
            </th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700">
              vs ベンチ Sharpe
            </th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
          {scenarios.map((s) => {
            const sharpeDiff = s.stats.sharpe - benchmarkSharpe;
            const isBaseline = s.cashYield === 0;
            return (
              <tr key={s.cashYield} className={isBaseline ? "bg-gray-50" : ""}>
                <td className={isBaseline ? "font-semibold" : ""}>
                  {s.label}
                  {isBaseline && (
                    <span className="block text-[10px] text-gray-400">
                      本体モデルに一致
                    </span>
                  )}
                </td>
                <td
                  className={`text-right font-mono ${returnColorClass(s.stats.totalReturn)}`}
                >
                  {formatPct(s.stats.totalReturn)}
                </td>
                <td
                  className={`text-right font-mono ${returnColorClass(s.stats.cagr)}`}
                >
                  {formatPct(s.stats.cagr)}
                </td>
                <td
                  className={`text-right font-mono ${returnColorClass(s.stats.alpha)}`}
                >
                  {formatPct(s.stats.alpha)} pp
                </td>
                <td className="text-right font-mono">
                  {s.stats.sharpe.toFixed(2)}
                </td>
                <td
                  className={`text-right font-mono ${
                    sharpeDiff >= 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {sharpeDiff >= 0 ? "+" : ""}
                  {sharpeDiff.toFixed(2)}
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-gray-200 bg-white">
            <td className="text-gray-500 italic">
              ベンチマーク（100% 株 buy & hold）
            </td>
            <td className="text-right font-mono text-gray-500">—</td>
            <td
              className={`text-right font-mono ${returnColorClass(benchmarkCagr)}`}
            >
              {formatPct(benchmarkCagr)}
            </td>
            <td className="text-right font-mono text-gray-500">—</td>
            <td className="text-right font-mono text-gray-500">
              {benchmarkSharpe.toFixed(2)}
            </td>
            <td className="text-right font-mono text-gray-500">—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TradeLog({ section }: { section: PortfolioSection }) {
  const [expanded, setExpanded] = useState(false);
  const all = section.trades;
  if (all.length === 0) return null;
  const visible = expanded ? all.slice().reverse() : all.slice(-12).reverse();

  return (
    <div className="not-prose">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border border-gray-200 rounded-lg min-w-[480px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                日付
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                温度
              </th>
              <th className="px-3 py-2 text-left font-semibold text-gray-700">
                帯
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                → 株比率
              </th>
              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                NAV
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
            {visible.map((t) => (
              <tr key={`${t.date}-${t.toEquityRatio}`}>
                <td className="font-mono text-gray-600">{t.date}</td>
                <td
                  className="text-right font-mono"
                  style={{ color: getSentimentColor(t.score) }}
                >
                  {t.score}
                </td>
                <td className="text-gray-600">{t.band}</td>
                <td className="text-right font-mono">
                  {(t.fromEquityRatio * 100).toFixed(0)}% →{" "}
                  <strong>{(t.toEquityRatio * 100).toFixed(0)}%</strong>
                </td>
                <td className="text-right font-mono text-gray-500">
                  {t.navBefore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {all.length > 12 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-gray-500 hover:text-gray-800"
        >
          {expanded ? "▲ 直近 12 件のみ表示" : `▼ 全 ${all.length} 件を表示`}
        </button>
      )}
    </div>
  );
}

export default function PortfolioBody({ history }: Props) {
  const [market, setMarket] = useState<PortfolioMarket>("jp");
  const [period, setPeriod] = useState<PortfolioPeriod>("5Y");

  useEffect(() => {
    trackEvent("portfolio_view", {});
  }, []);

  function handleMarketChange(m: PortfolioMarket) {
    setMarket(m);
    trackEvent("portfolio_market_switch", { market: m });
  }

  function handlePeriodChange(p: PortfolioPeriod) {
    setPeriod(p);
    trackEvent("portfolio_period_switch", { period: p });
  }

  const section = history.portfolios[market];
  const displayData = useMemo(
    () => slicePortfolioDailyByDays(section.daily, PERIOD_DAYS[period]),
    [section.daily, period]
  );

  const currentScore = section.current.score;
  const longPeriod = period === "5Y" || period === "10Y";

  return (
    <div className="space-y-8 not-prose">
      <div className="flex gap-2 flex-wrap">
        {(["jp", "us"] as PortfolioMarket[]).map((m) => (
          <button
            key={m}
            onClick={() => handleMarketChange(m)}
            className={`px-4 py-2 text-sm rounded-full transition-colors ${
              market === m
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {MARKET_LABEL[m]}
          </button>
        ))}
      </div>

      <section aria-labelledby="allocation-heading" className="bg-white rounded-2xl shadow-md p-6">
        <h3 id="allocation-heading" className="text-base font-bold text-gray-900 mb-3">
          現在の配分（{section.current.date} 時点）
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">温度</div>
            <div className="text-lg font-bold">
              {currentScore != null ? (
                <span style={{ color: getSentimentColor(currentScore) }}>
                  {currentScore} 点
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}{" "}
              <span className="text-sm font-normal text-gray-500">
                （{section.current.band}）
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">NAV（初期=100）</div>
            <div className="text-lg font-bold font-mono">
              {section.current.nav.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">
              累計{" "}
              <span className={returnColorClass(section.stats.totalReturn)}>
                {formatPct(section.stats.totalReturn)}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">ベンチマーク比（α）</div>
            <div
              className={`text-lg font-bold font-mono ${returnColorClass(section.stats.alpha)}`}
            >
              {formatPct(section.stats.alpha)} pp
            </div>
            <div className="text-xs text-gray-500">
              ベンチ: {section.current.benchmark.toFixed(1)}
            </div>
          </div>
        </div>
        <AllocationBar equityRatio={section.current.equityRatio} />
      </section>

      <section aria-labelledby="chart-heading" className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex flex-col gap-2 mb-4">
          <h3 id="chart-heading" className="text-base font-bold text-gray-900">
            累計 NAV 推移（初期=100）
          </h3>
          <PeriodSwitcher<PortfolioPeriod>
            periods={PERIODS}
            labels={PERIOD_LABELS}
            value={period}
            onChange={handlePeriodChange}
          />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={displayData}
            margin={{ top: 8, right: 12, bottom: 0, left: -20 }}
          >
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(d) => formatXAxisDate(d, longPeriod)}
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: "11px" }}
              iconSize={8}
              align="right"
              verticalAlign="top"
            />
            <Line
              name="温度ルール"
              type="monotone"
              dataKey="nav"
              stroke={
                currentScore != null ? getSentimentColor(currentScore) : "#6b7280"
              }
              strokeWidth={2}
              dot={false}
            />
            <Line
              name="一括買い持ち"
              type="monotone"
              dataKey="benchmark"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              name="月次積立"
              type="monotone"
              dataKey="benchmarkDca"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              strokeDasharray="2 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <p className="text-[11px] text-gray-500 mt-2">
          温度ルール = {section.equitySymbol} と現金を月次にリバランス /
          一括買い持ち = 初日に {section.equitySymbol} を全額購入し保有 /
          月次積立 = 同額を N ヶ月に按分して毎月投入（NISA 積立型）
        </p>
      </section>

      <section aria-labelledby="stats-heading" className="bg-white rounded-2xl shadow-md p-6">
        <h3 id="stats-heading" className="text-base font-bold text-gray-900 mb-3">
          バックテスト統計（{history.dataRange.from} 〜 {history.dataRange.to}）
        </h3>
        <StatsTable section={section} />
      </section>

      {section.cashYieldSensitivity &&
        section.cashYieldSensitivity.length > 0 && (
          <section
            aria-labelledby="sensitivity-heading"
            className="bg-white rounded-2xl shadow-md p-6"
          >
            <h3
              id="sensitivity-heading"
              className="text-base font-bold text-gray-900 mb-2"
            >
              現金金利シナリオの感度分析
            </h3>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              本体モデルは現金金利 = 0% を前提にしています。現実には
              MMF や短期国債で年 1〜3% の利息が付くため、本戦略の<strong>相対的な不利さは実際には小さくなります</strong>。
              以下は同じルールで現金金利だけを差し替えた場合の過去約10年の結果です。
            </p>
            <CashYieldSensitivityTable
              scenarios={section.cashYieldSensitivity}
              benchmarkCagr={section.stats.benchmarkCagr}
              benchmarkSharpe={section.stats.benchmarkSharpe}
            />
            <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
              ※ 金利は年率想定。日次複利 1/252 で計算（シミュレーター内）。税金・手数料は引き続き 0 前提。現金金利は株価とは独立に付与されるため、ドローダウンには影響しません。
            </p>
          </section>
        )}

      <section aria-labelledby="trades-heading" className="bg-white rounded-2xl shadow-md p-6">
        <h3 id="trades-heading" className="text-base font-bold text-gray-900 mb-3">
          リバランス履歴
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          毎月第一営業日に温度帯を判定し、目標株比率へスイッチ。直近から表示。
        </p>
        <TradeLog section={section} />
      </section>

      <InvestingBooksCTA placement="portfolio" article="portfolio" />
    </div>
  );
}
