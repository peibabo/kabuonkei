import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "NISA積立の人が株温計をどう使うか",
  description:
    "毎月積立の人に温度計は関係ない？いいえ、むしろ積立心理の味方になります。相場急落時の「今月やめようか」の誘惑に抗うための客観的なモノサシとしての使い方を解説します。",
  openGraph: {
    title: "NISA積立の人が株温計をどう使うか | 株温計",
    description:
      "毎月積立で温度計を使う3つの視点と、極寒/平温/沸騰それぞれの具体的なアクション指針。",
  },
  alternates: {
    canonical: "/guide/nisa-tsumitate",
  },
};

export default function NisaTsumitateGuidePage() {
  return (
    <StaticPageLayout title="📈 NISA積立の人が株温計をどう使うか">
      <p className="text-base leading-relaxed">
        「毎月決まった額を自動で積み立てているだけだから、温度計は関係ないのでは？」
        — そう思う方も多いと思います。しかし実際は、<strong>NISA積立こそ温度計が味方になる</strong>局面が多いのです。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          あなたが該当するなら
        </h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>つみたて投資枠でオルカン／S&amp;P500 インデックスを定額積立している</li>
          <li>クレカ積立で毎月 5 万〜10 万円を自動拠出している</li>
          <li>「暴落が来たらどうしよう」「今やめるべき？」と時々不安になる</li>
          <li>スポット買いのタイミングを何となく探している</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          なぜ積立の人にも温度計が役立つのか
        </h2>
        <p className="leading-relaxed">
          積立は「淡々と続けること」が最大の武器です。ただ実際は、相場が荒れると
          <strong>「今月は少なくしようか」「一度停止しようか」</strong>
          という心理的誘惑が湧きます。この心理的ブレは、過去の暴落期ほど強く働き、
          リカバリー局面の安値を逃す最大の要因になります。
        </p>
        <p className="leading-relaxed mt-3">
          株温計は「今が過去と比べてどの位置か」を 0-100 の客観的スコアで示します。
          <strong>感情に流されず、積立を続けるための外部指標</strong>として使えます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          温度帯 × NISA積立の行動指針
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-left font-semibold">心理状態</th>
                <th className="px-3 py-2 text-left font-semibold">積立の人の行動</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">極寒 (0-20)</td>
                <td className="px-3 py-2">総悲観・積立停止の誘惑が最大</td>
                <td className="px-3 py-2">
                  <strong>むしろチャンス局面</strong>。通常の積立を続ける。余剰資金があればスポット追加検討。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">冷え込み (21-40)</td>
                <td className="px-3 py-2">悲観・利下げ期待が混在</td>
                <td className="px-3 py-2">通常通り積立継続。ボーナス月の上乗せ候補。</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">平温 (41-60)</td>
                <td className="px-3 py-2">普通の地合い</td>
                <td className="px-3 py-2">淡々と積立継続。特別なアクション不要。</td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">過熱 (61-80)</td>
                <td className="px-3 py-2">楽観・周囲の「儲かった話」が増える</td>
                <td className="px-3 py-2">
                  積立は継続、だが<strong>追加スポットは見送り</strong>。リバランス点検のタイミング。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">沸騰 (81-100)</td>
                <td className="px-3 py-2">バブル的楽観・「もう手遅れ」の FOMO</td>
                <td className="px-3 py-2">
                  「利確したい」誘惑を抑える客観情報として活用。長期積立の前提を崩さない。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          シナリオ例：コロナショック時の積立
        </h2>
        <p className="leading-relaxed">
          2020 年 3 月のコロナショック時、株温計の日本版温度は「極寒」帯に突入しました。
          ニュースは不安一色、「積立をやめたい」と感じた人は多かったはずです。
        </p>
        <p className="leading-relaxed mt-3">
          ですが、
          <Link href="/" className="underline hover:text-gray-900">
            「過去の統計」カード
          </Link>
          が示す通り、<strong>極寒帯から 3 ヶ月後の日経225 平均リターンは +11.5%、勝率 100%</strong>
          （2016年以降の集計）。積立を止めずに続けた人が、結果的に最もリカバリーの恩恵を受けた局面でした。
        </p>
        <p className="leading-relaxed mt-3">
          温度計は「今ここで止めるな」を客観的に伝えるための道具です。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          さらに深掘りするために
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <Link href="/" className="underline hover:text-gray-900">
              トップページ
            </Link>
            で今日の温度と温度推移を確認
          </li>
          <li>
            <Link href="/events" className="underline hover:text-gray-900">
              主要イベント一覧
            </Link>
            で過去の暴落局面とその後のリターンを確認
          </li>
          <li>
            <Link href="/guide" className="underline hover:text-gray-900">
              他の投資家タイプ別ガイド
            </Link>
            （短期トレーダー / FIRE目指し）
          </li>
        </ul>
      </section>

      <section>
        <p className="mt-8 text-xs text-gray-500 leading-relaxed">
          ※ 本ガイドは投資助言ではありません。NISA
          口座の運用方針はご自身の投資目的・リスク許容度に合わせて決定してください。過去のリターンは将来の運用成果を保証するものではありません。
        </p>
      </section>
    </StaticPageLayout>
  );
}
