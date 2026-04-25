"use client";

import Link from "next/link";
import { formatJstFullDateLabel } from "@/lib/jst-date";
import { getIssueNumber } from "@/lib/issue-number";
import { requestOpenAlertModal } from "@/lib/alert-modal-bus";

export default function DashboardHeader({
  lastUpdated,
}: {
  lastUpdated: string;
}) {
  // 「2026年4月25日(土)　第7号」を JST で算出
  const dateLabel = formatJstFullDateLabel();
  const issueNumber = getIssueNumber();

  return (
    <header className="mb-6 md:mb-8">
      {/* タイトル + 右肩 CTA */}
      <div className="flex items-end justify-between flex-wrap gap-2">
        <h1 className="font-serif-jp text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
          🌡 株温計
        </h1>
        <nav className="flex items-center gap-3 text-xs md:text-sm">
          <Link
            href="/about"
            className="text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
          >
            これは何？
          </Link>
          <span className="text-gray-300" aria-hidden>
            /
          </span>
          {/* AlertBanner と同じモーダル直開きに統一（bus 経由） */}
          <button
            type="button"
            onClick={() => requestOpenAlertModal("header")}
            className="text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline cursor-pointer"
          >
            アラート登録
          </button>
        </nav>
      </div>

      {/* 紙面風 号数帯 */}
      <div className="mt-2 border-y border-gray-300 py-1.5 flex items-center justify-between gap-3 text-xs md:text-sm text-gray-700">
        <span className="font-medium">{dateLabel}</span>
        {issueNumber > 0 && (
          <span className="tracking-widest">第 {issueNumber} 号</span>
        )}
        <span className="text-gray-500">最終更新 {lastUpdated}</span>
      </div>

      <p className="mt-3 text-sm text-gray-500">今日の相場、熱い？冷たい？</p>
    </header>
  );
}
