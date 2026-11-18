import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { LEARN_ARTICLES } from "@/lib/learn-articles";

export const metadata: Metadata = {
  title: "解説記事",
  description:
    "VIX・Fear & Greed・信用倍率など、株温計が扱う指標を初心者向けに腰を据えて解説する読み物。「○○とは？」というクエリに正面から答えます。",
  openGraph: {
    title: "解説記事 | 株温計",
    description:
      "VIX・Fear & Greed・信用倍率など、初心者向けに腰を据えて解説する読み物。",
  },
  alternates: {
    canonical: "/learn",
  },
};

export default function LearnIndexPage() {
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "解説記事" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="learn-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title="📚 解説記事">
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-base leading-relaxed">
          市場で頻繁に言及される指標について、定義・読み方・実データでの検証を含めて
          腰を据えて解説する読み物です。「○○とは？」と検索するときに最初に当たる読みものを目指します。
        </p>
        <p className="text-xs text-gray-500 mt-2">
          短い定義だけ確認したい場合は{" "}
          <Link href="/glossary" className="underline hover:text-gray-700">
            用語集
          </Link>
          、独自データを使った検証記事は{" "}
          <Link href="/analysis" className="underline hover:text-gray-700">
            分析記事
          </Link>
          をご覧ください。
        </p>

        <ul className="grid grid-cols-1 gap-4 mt-6 list-none pl-0">
          {LEARN_ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/learn/${a.slug}`}
                className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {a.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      {a.title}
                    </h2>
                    <p className="text-xs text-gray-400 mb-2">
                      公開: <time dateTime={a.publishedAt}>{a.publishedAt}</time>
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {a.description}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </StaticPageLayout>
    </>
  );
}
