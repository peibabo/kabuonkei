import type { ReactNode } from "react";
import type { PeriodStats } from "@/lib/historical-stats";
import { formatReturn, returnColorClass } from "@/lib/format";

/**
 * 解説記事（/learn）に株温計の自前データを載せるための小さな表。
 * 「条件ごとに、その後 N ヶ月の指数の平均リターンと勝率」を並べる。
 * 各記事の検証の詳細は分析記事に任せ、ここではエッセンスだけを出す。
 */

/** 表に出せる期間（各データの期間キーと共通） */
export type ForwardPeriodKey = "1m" | "3m" | "6m" | "1y";

export interface ForwardReturnRow {
  label: string;
  /** 条件に当てはまった日数・週数・回数など（単位は countUnit） */
  count: number;
  /** 表に使うのは平均・勝率・集計数だけ（複数セルをまとめた成績も載せられるように） */
  stats: Partial<
    Record<ForwardPeriodKey, Pick<PeriodStats, "avgReturn" | "winRate" | "sampleSize">>
  >;
  /** 本文で取り上げる行を強調する */
  highlight?: boolean;
}

interface Props {
  rows: ForwardReturnRow[];
  /** 表示する期間キーと見出し（例: [{ key: "3m", label: "3ヶ月後" }]） */
  periods: { key: ForwardPeriodKey; label: string }[];
  /** 1 列目の見出し */
  conditionLabel: string;
  /** 件数列の単位（"日" / "週" / "回"） */
  countUnit: string;
  /** 表の説明（caption として表示し、表の名前にもなる） */
  caption: string;
}

/** 解説記事の表の外枠（横スクロール・caption・行の余白）。key/value の表もこれで包む */
export function LearnDataTable({
  caption,
  children,
}: {
  caption: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto not-prose mt-4">
      <table className="w-full text-base border border-gray-200 rounded-lg [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_tbody>tr]:border-t [&_tbody>tr]:border-gray-100">
        <caption className="text-left text-sm text-gray-600 mb-2">
          {caption}
        </caption>
        {children}
      </table>
    </div>
  );
}

/** 0 はどちらの色でもなく灰色にする（format の returnColorClass は 0 を負側に寄せるため） */
export function learnReturnColorClass(value: number | null | undefined): string {
  if (value === 0) return "text-gray-600";
  return returnColorClass(value);
}

export default function ForwardReturnTable({
  rows,
  periods,
  conditionLabel,
  countUnit,
  caption,
}: Props) {
  return (
    <LearnDataTable caption={caption}>
      <thead className="bg-gray-50">
        <tr>
          <th scope="col" className="text-left font-semibold">
            {conditionLabel}
          </th>
          <th scope="col" className="text-right font-semibold">
            件数
          </th>
          {periods.map((p) => (
            <th key={p.key} scope="col" className="text-right font-semibold">
              {p.label}
              <span className="block text-xs font-normal text-gray-500">
                平均リターン
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={row.highlight ? "bg-amber-50 font-semibold" : undefined}
          >
            <th scope="row" className="text-left font-mono">
              {row.label}
            </th>
            <td className="text-right font-mono text-gray-600">
              {row.count.toLocaleString()}
              {countUnit}
            </td>
            {periods.map((p) => {
              const s = row.stats[p.key];
              return (
                <td key={p.key} className="text-right font-mono whitespace-nowrap">
                  <span className={learnReturnColorClass(s?.avgReturn)}>
                    {formatReturn(s?.avgReturn)}
                  </span>
                  {/* 直近は先のリターンがまだ出ていないため、件数より少ない数で集計している */}
                  <span className="block text-sm font-normal text-gray-500">
                    {s
                      ? `勝率 ${s.winRate.toFixed(0)}%・${s.sampleSize.toLocaleString()}${countUnit}`
                      : "—"}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </LearnDataTable>
  );
}
