import Link from "next/link";

export default function DashboardHeader({
  lastUpdated,
}: {
  lastUpdated: string;
}) {
  return (
    <header className="text-center mb-8">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
        🌡 株温計
      </h1>
      <p className="text-gray-500 mt-2">今日の相場、熱い？冷たい？</p>
      <p className="text-xs text-gray-400 mt-1">最終更新: {lastUpdated}</p>
      <Link
        href="/about"
        className="inline-block mt-2 text-xs text-gray-500 hover:text-gray-800 underline"
      >
        これは何？
      </Link>
    </header>
  );
}
