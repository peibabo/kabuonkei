import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/breadcrumb-jsonld";

interface Props {
  items: BreadcrumbItem[];
}

/**
 * 表示用パンくず。最終項目は現在ページ（リンク無し・aria-current）として描画。
 * BreadcrumbList JSON-LD は別途 buildBreadcrumbJsonLd で埋め込む前提。
 */
export default function Breadcrumb({ items }: Props) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="パンくず" className="text-xs text-gray-500 mb-4">
      <ol className="flex flex-wrap items-center gap-x-1 list-none pl-0">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.name}-${idx}`} className="flex items-center gap-x-1">
              {item.path && !isLast ? (
                <Link
                  href={item.path}
                  className="hover:text-gray-700 hover:underline"
                >
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-gray-700">
                  {item.name}
                </span>
              )}
              {!isLast && <span aria-hidden="true">/</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
