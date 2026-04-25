import type { ReactNode } from "react";

export default function DashboardSection({
  id,
  emoji,
  title,
  description,
  children,
}: {
  id: string;
  emoji: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `dash-sect-${id}-heading`;
  return (
    // id="..." はヒーロー CTA / Header 内アンカーリンクのスクロール先になる。
    // scroll-margin-top は header / sticky 要素を見越した余白（globals.css 側で扱ってもよい）。
    <section
      id={id}
      aria-labelledby={headingId}
      className="mb-10 scroll-mt-4"
    >
      <div className="mb-4">
        <h2
          id={headingId}
          className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2"
        >
          <span aria-hidden>{emoji}</span>
          <span>{title}</span>
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
