import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-600">
        <p className="mb-3 text-xs text-gray-500">
          本サイトは情報提供のみを目的としており、投資助言・勧誘ではありません。掲載する過去の統計や類似日のリターンは過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任でお願いします。
        </p>
        <p className="mb-4 text-xs text-gray-500">
          データ: Yahoo Finance / CNN Fear &amp; Greed / 日本取引所グループ (JPX)
        </p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
          <Link href="/about" className="hover:text-gray-900 hover:underline">
            株温計とは
          </Link>
          <Link href="/events" className="hover:text-gray-900 hover:underline">
            主要イベント一覧
          </Link>
          <Link href="/widget" className="hover:text-gray-900 hover:underline">
            ウィジェット
          </Link>
          <Link href="/terms" className="hover:text-gray-900 hover:underline">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-gray-900 hover:underline">
            プライバシーポリシー
          </Link>
        </nav>
        <p className="text-xs text-gray-400">© 2026 株温計</p>
      </div>
    </footer>
  );
}
