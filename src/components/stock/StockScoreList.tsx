import { getSentimentTextClass } from "@/lib/sentiment";
import { ranksWithTies, type StockSummary } from "@/lib/stock-temperature/stats";
import { formatScoreDiff } from "@/lib/stock-temperature/format";

interface Props {
  items: StockSummary[];
  /**
   * 指定するとランキング表示（順位・業種・前日比の列を出す）。
   * items はこの値で並び済みであること。同じ値は同順位になる。
   * 省略時は銘柄と温度だけのコンパクトな一覧。
   */
  rankBy?: "score" | "d1";
}

/** 銘柄ページ内の表と共通の見た目。セルのクラスは行数ぶん繰り返さず table 側にまとめる */
export const STOCK_TABLE_CLASS =
  "w-full text-sm border-collapse [&_td]:py-1 [&_th]:py-1 [&_th]:font-normal [&_thead_tr]:border-b [&_thead_tr]:border-gray-200 [&_thead_tr]:text-gray-500 [&_tbody_tr]:border-b [&_tbody_tr]:border-gray-100 [&_a]:underline";

/**
 * 銘柄名・温度の一覧表（/stock・/ranking・銘柄ページの同業種リンクで共用）。
 * 1ページに数百行並ぶため、next/link（クライアントコンポーネントで行ごとに
 * props がペイロードに載る）ではなく素の <a> を使って HTML サイズを抑えている。
 */
export default function StockScoreList({ items, rankBy }: Props) {
  const ranks = rankBy ? ranksWithTies(items, (s) => s[rankBy]) : null;
  return (
    <table className={STOCK_TABLE_CLASS}>
      <thead>
        <tr>
          {ranks && <th className="text-right pr-2 w-8">順位</th>}
          <th className="text-left">銘柄</th>
          {ranks && <th className="text-left hidden sm:table-cell">業種</th>}
          <th className="text-right">温度</th>
          {ranks && <th className="text-right">前日比</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((s, i) => (
          <tr key={s.code}>
            {ranks && <td className="pr-2 text-right text-gray-500">{ranks[i]}</td>}
            <td>
              <a href={`/stock/${s.code}`}>{s.name}</a>（{s.code}）
            </td>
            {ranks && <td className="text-gray-600 hidden sm:table-cell">{s.sector}</td>}
            <td className={`text-right font-semibold ${getSentimentTextClass(s.score)}`}>
              {s.score}
            </td>
            {ranks && <td className="text-right">{formatScoreDiff(s.d1)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
