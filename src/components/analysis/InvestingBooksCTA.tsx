"use client";

import { trackEvent } from "@/lib/analytics";

interface BookItem {
  id: "losers-game" | "random-walk" | "intelligent-investor";
  title: string;
  author: string;
  tagline: string;
  /**
   * 暫定で Amazon 商品ページの直リンク。Amazon アソシエイト登録後は
   * associate tag 付き URL に差し替える。
   * 差し替え時は id をキーにすれば 1 箇所で置換可能。
   */
  href: string;
}

const BOOKS: BookItem[] = [
  {
    id: "losers-game",
    title: "敗者のゲーム",
    author: "チャールズ・エリス",
    tagline: "「市場平均に勝ち続けるのは天才でも難しい」を示した古典。インデックス投資の教科書",
    href: "https://www.amazon.co.jp/dp/4532358450", // 暫定: アソシエイト登録後に差し替え
  },
  {
    id: "random-walk",
    title: "ウォール街のランダム・ウォーカー",
    author: "バートン・マルキール",
    tagline: "50 年にわたり読まれ続ける投資の定番。市場のランダム性と長期投資の強さ",
    href: "https://www.amazon.co.jp/dp/4532358663", // 暫定: アソシエイト登録後に差し替え
  },
  {
    id: "intelligent-investor",
    title: "賢明なる投資家",
    author: "ベンジャミン・グレアム",
    tagline: "ウォーレン・バフェットの師による、相場の恐怖と欲望に左右されない投資哲学",
    href: "https://www.amazon.co.jp/dp/4775971468", // 暫定: アソシエイト登録後に差し替え
  },
];

interface Props {
  placement:
    | "middle_cta"
    | "bottom_cta"
    | "boost_banner"
    | "portfolio";
  /** GA4 イベントの article キー。省略時は "vix-threshold-sp500"（既存記事向けの後方互換） */
  article?: string;
}

export default function InvestingBooksCTA({
  placement,
  article = "vix-threshold-sp500",
}: Props) {
  function handleClick(bookId: BookItem["id"]) {
    // 直リンク / アフィどちらでも共通イベント名を使い、ヒストリカル計測を継続させる
    trackEvent("book_cta_click", {
      article,
      book: bookId,
      placement,
    });
  }

  return (
    <aside
      aria-labelledby="books-cta-heading"
      className="bg-sky-50 border border-sky-200 rounded-xl p-5 my-8"
    >
      <h3 id="books-cta-heading" className="text-base font-bold text-gray-900 mb-1">
        📚 相場の心理に惑わされないための定番書籍
      </h3>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        VIX 高騰期のパニック売りも、沸騰期の FOMO も、根っこにあるのは「市場の熱気に飲まれる心理」です。いずれも長期投資の古典で、相場の統計を理解するうえで補助線になります。リンク先は Amazon の商品ページです。
      </p>
      <ul className="space-y-3 list-none pl-0">
        {BOOKS.map((b) => (
          <li key={b.id}>
            <a
              href={b.href}
              rel="noopener noreferrer"
              target="_blank"
              data-book={b.id}
              onClick={() => handleClick(b.id)}
              className="block bg-white rounded-lg px-4 py-3 border border-sky-200 hover:border-sky-400 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900">{b.title}</div>
                  <div className="text-xs text-sky-800/80">{b.author}</div>
                </div>
                <span className="text-xs text-sky-700 shrink-0">Amazon →</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                {b.tagline}
              </p>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        ※ 書籍は編集者（運営者 ao）が実際に参考にしている古典です。将来的にリンクが Amazon アソシエイト経由に切り替わる可能性があります（PR）。
      </p>
    </aside>
  );
}
