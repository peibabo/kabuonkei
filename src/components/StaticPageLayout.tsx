import type { ReactNode } from "react";
import Link from "next/link";

interface Props {
  title: string;
  children: ReactNode;
}

/** /about, /terms, /privacy など静的ページ共通の外枠レイアウト */
export default function StaticPageLayout({ title, children }: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← トップへ戻る
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">{title}</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">{children}</div>
    </main>
  );
}
