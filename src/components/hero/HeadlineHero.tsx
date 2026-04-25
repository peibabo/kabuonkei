import Link from "next/link";
import { buildHeroCopy, type HeroCta } from "@/lib/headline";

const CTA_HREF: Record<HeroCta, string> = {
  "similar-days": "#now",
  hints: "#hint",
  alert: "#alert-banner",
};

const CTA_LABEL: Record<HeroCta, string> = {
  "similar-days": "類似日を見る",
  hints: "あなた向けヒント",
  alert: "アラート登録",
};

export default function HeadlineHero({
  jp,
  us,
  jpDelta,
  usDelta,
  similarCount,
  winRate3m,
}: {
  jp: number | null;
  us: number;
  jpDelta: number | null;
  usDelta: number;
  similarCount?: number;
  winRate3m?: number;
}) {
  const copy = buildHeroCopy(
    { jp, us, jpDelta, usDelta },
    { similarCount, winRate3m },
  );

  return (
    <section
      aria-labelledby="hero-headline"
      className="bg-white border-y-2 border-gray-900 px-6 py-8 md:px-10 md:py-10 mb-8"
    >
      <p className="text-xs tracking-widest text-gray-500 mb-3">今日の見出し</p>
      <h2
        id="hero-headline"
        className="font-serif-jp text-3xl md:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight"
      >
        {copy.headline}
      </h2>
      <hr className="my-4 border-gray-300" />
      <p className="text-base md:text-lg text-gray-700 leading-relaxed">
        {copy.subline}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href={CTA_HREF[copy.ctaPrimary]}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          {CTA_LABEL[copy.ctaPrimary]} →
        </Link>
        <Link
          href={CTA_HREF[copy.ctaSecondary]}
          className="inline-flex items-center justify-center px-5 py-2.5 bg-white border border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          {CTA_LABEL[copy.ctaSecondary]} →
        </Link>
      </div>
    </section>
  );
}
