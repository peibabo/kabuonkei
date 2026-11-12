import type { StockSummary } from "@/lib/stock-temperature";
import { formatScoreDiff } from "@/lib/stock-temperature/format";

interface Props {
  items: StockSummary[];
  /** 先頭に順位を表示する */
  ranked?: boolean;
  /** 業種の列を表示する */
  showSector?: boolean;
  /** 前日比の列を表示する */
  showDiff?: boolean;
}

/** 温度帯の色（sentiment.ts の getSentimentColor と同じ色）。行ごとの inline style を避ける */
function scoreClass(score: number): string {
  if (score <= 20) return "text-blue-600";
  if (score <= 40) return "text-sky-500";
  if (score <= 60) return "text-yellow-600";
  if (score <= 80) return "text-orange-600";
  return "text-red-600";
}

/**
 * 銘柄名・温度の一覧表（/stock と /ranking で共用）。
 * 1ページに数百行並ぶため、next/link（クライアントコンポーネントで行ごとに
 * props がペイロードに載る）ではなく素の <a> を使い、セルのクラスは table 側にまとめて
 * HTML サイズを抑えている。
 */
export default function StockScoreList({
  items,
  ranked = false,
  showSector = false,
  showDiff = true,
}: Props) {
  return (
    <table className="w-full text-sm border-collapse [&_td]:py-1 [&_th]:py-1 [&_th]:font-normal [&_tbody_tr]:border-b [&_tbody_tr]:border-gray-100 [&_a]:underline">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          {ranked && <th className="text-right pr-2 w-8">順位</th>}
          <th className="text-left">銘柄</th>
          {showSector && <th className="text-left hidden sm:table-cell">業種</th>}
          <th className="text-right">温度</th>
          {showDiff && <th className="text-right">前日比</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((s, i) => (
          <tr key={s.code}>
            {ranked && <td className="pr-2 text-right text-gray-500">{i + 1}</td>}
            <td>
              <a href={`/stock/${s.code}`}>{s.name}</a>（{s.code}）
            </td>
            {showSector && <td className="text-gray-600 hidden sm:table-cell">{s.sector}</td>}
            <td className={`text-right font-semibold ${scoreClass(s.score)}`}>
              {s.score}
            </td>
            {showDiff && <td className="text-right">{formatScoreDiff(s.d1)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
