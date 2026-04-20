"use client";

import { getSentimentColor, getSentimentLevel } from "@/lib/sentiment";
import type { SimilarDayMatch } from "@/lib/types";
import { formatReturn, returnColorClass } from "@/lib/format";

interface Props {
  title: string;
  subtitle: string;
  currentScore: number;
  similarDays: SimilarDayMatch[];
  marketLabel: string; // "日経225" | "S&P500"
  dataRangeFrom: string;
  dataRangeTo: string;
}

function Headline({
  match,
  currentScore,
  marketLabel,
}: {
  match: SimilarDayMatch;
  currentScore: number;
  marketLabel: string;
}) {
  const color = getSentimentColor(match.score);
  const level = getSentimentLevel(match.score);

  return (
    <div
      className="rounded-lg p-4 mb-4"
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      <p className="text-sm text-gray-700 mb-2 leading-relaxed">
        今日の温度（
        <span className="font-bold" style={{ color: getSentimentColor(currentScore) }}>
          {currentScore}
        </span>
        ）に最も近い過去の日は
      </p>
      <p className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
        📅 {match.date}
        {match.eventLabel && (
          <span
            className="ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full align-middle"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {match.eventLabel}
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500 mb-3">
        温度 <span className="font-semibold" style={{ color }}>{match.score}</span>（{level}）
      </p>
      <p className="text-xs text-gray-500 mb-1">その後の{marketLabel}</p>
      <div className="flex gap-4 text-sm">
        <span>
          1ヶ月後:{" "}
          <span className={`font-bold ${returnColorClass(match.return1m)}`}>
            {formatReturn(match.return1m)}
          </span>
        </span>
        <span>
          3ヶ月後:{" "}
          <span className={`font-bold ${returnColorClass(match.return3m)}`}>
            {formatReturn(match.return3m)}
          </span>
        </span>
        <span>
          6ヶ月後:{" "}
          <span className={`font-bold ${returnColorClass(match.return6m)}`}>
            {formatReturn(match.return6m)}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function SimilarDaysCard({
  title,
  subtitle,
  currentScore,
  similarDays,
  marketLabel,
  dataRangeFrom,
  dataRangeTo,
}: Props) {
  if (similarDays.length === 0) {
    return null;
  }
  const [head, ...rest] = similarDays;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

      <Headline match={head} currentScore={currentScore} marketLabel={marketLabel} />

      {rest.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-2">類似度TOP5（スコア差が近い順）</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium">
                    日付
                  </th>
                  <th className="px-2 py-2 text-center text-xs text-gray-500 font-medium">
                    温度
                  </th>
                  <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                    1M
                  </th>
                  <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                    3M
                  </th>
                  <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                    6M
                  </th>
                </tr>
              </thead>
              <tbody>
                {[head, ...rest].map((m) => {
                  const color = getSentimentColor(m.score);
                  return (
                    <tr key={m.date} className="border-b border-gray-50">
                      <td className="px-2 py-2 text-sm text-gray-700">
                        <div>{m.date}</div>
                        {m.eventLabel && (
                          <div className="text-xs text-gray-400">
                            {m.eventLabel}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center text-sm">
                        <span
                          className="font-semibold"
                          style={{ color }}
                        >
                          {m.score}
                        </span>
                      </td>
                      <td
                        className={`px-2 py-2 text-center text-sm ${returnColorClass(m.return1m)}`}
                      >
                        {formatReturn(m.return1m)}
                      </td>
                      <td
                        className={`px-2 py-2 text-center text-sm ${returnColorClass(m.return3m)}`}
                      >
                        {formatReturn(m.return3m)}
                      </td>
                      <td
                        className={`px-2 py-2 text-center text-sm ${returnColorClass(m.return6m)}`}
                      >
                        {formatReturn(m.return6m)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>
          データ期間: {dataRangeFrom} 〜 {dataRangeTo}
        </p>
        <p>
          ※ 類似日の将来リターンは参考値です。将来の相場を保証するものではありません。
        </p>
      </div>
    </div>
  );
}
