import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "投資家タイプ別ガイド",
  description:
    "株温計の使い方は投資スタイルによって変わります。NISA積立・短期トレーダー・FIRE目指し（長期複利）の 3 タイプ別に、温度帯ごとの具体的なアクション指針を解説します。",
  openGraph: {
    title: "投資家タイプ別ガイド | 株温計",
    description:
      "NISA積立 / 短期トレーダー / FIRE目指しのタイプ別に、温度計の具体的な使い方を解説。",
  },
  alternates: {
    canonical: "/guide",
  },
};

interface Guide {
  slug: string;
  icon: string;
  title: string;
  description: string;
  audience: string;
}

const GUIDES: Guide[] = [
  {
    slug: "nisa-tsumitate",
    icon: "📈",
    title: "NISA積立の人が株温計をどう使うか",
    audience: "つみたて投資枠・クレカ積立でオルカン／S&P500 を積立している人",
    description:
      "毎月積立の心理的ブレを抑えるための客観的なモノサシ。極寒時こそ積立を止めないための視点。",
  },
  {
    slug: "short-term-trader",
    icon: "⚡",
    title: "短期トレーダーが株温計をどう使うか",
    audience: "デイトレ・スイング・信用取引で日経先物や個別銘柄を取引する人",
    description:
      "マクロセンチメントの偏りを測る地合い判定ツール。類似日機能でシナリオを立てる使い方。",
  },
  {
    slug: "fire-long-term",
    icon: "🎯",
    title: "FIRE目指し（長期複利）の人が株温計をどう使うか",
    audience:
      "FIRE を目指し積立＋手動スポット買い＋リバランスを行う長期投資家",
    description:
      "追加投資・リバランス点検・待機資金投入の判断補助。日米両市場を持つ人のクロス分析活用。",
  },
];

export default function GuideIndexPage() {
  return (
    <StaticPageLayout title="📘 投資家タイプ別ガイド">
      <p className="text-base leading-relaxed">
        株温計は誰にでも同じように使えるわけではありません。投資スタイルによって「今の温度」が示唆するアクションは変わります。あなたに近いタイプを選んで、具体的な使い方を確認してください。
      </p>

      <ul className="grid grid-cols-1 gap-4 mt-6 list-none pl-0">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/guide/${g.slug}`}
              className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">
                  {g.icon}
                </span>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">
                    {g.title}
                  </h2>
                  <p className="text-xs text-gray-500 mb-2">{g.audience}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {g.description}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8 pt-6 border-t border-gray-200 text-sm text-gray-600">
        <p>
          どのタイプにも当てはまらない・複数に当てはまる方は、近いガイドから読み始めて、他のガイドも併せてご覧ください。
          まずは{" "}
          <Link href="/" className="underline hover:text-gray-900">
            トップページで今日の温度
          </Link>
          を確認してから戻ってくると、より具体的にイメージしやすくなります。
        </p>
      </section>
    </StaticPageLayout>
  );
}
