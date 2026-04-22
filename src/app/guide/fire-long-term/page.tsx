import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "FIRE目指し（長期複利）の人が株温計をどう使うか",
  description:
    "FIRE 達成には長期複利が不可欠。株温計は「追加投資の判断」「リバランス点検」「暴落時の待機資金投入」に使える意思決定支援ツールです。温度帯別の長期投資アクションを解説します。",
  openGraph: {
    title: "FIRE目指し（長期複利）の人が株温計をどう使うか | 株温計",
    description:
      "追加投資・リバランス・待機資金投入の判断を温度帯別に整理。クロス分析・類似日・イベント詳細の合わせ技の使い方。",
  },
  alternates: {
    canonical: "/guide/fire-long-term",
  },
};

export default function FireLongTermGuidePage() {
  return (
    <StaticPageLayout title="🎯 FIRE目指し（長期複利）の人が株温計をどう使うか">
      <p className="text-base leading-relaxed">
        FIRE（経済的自立と早期退職）の達成には、長期の複利成長と市場の波を乗りこなす冷静さが不可欠です。
        積立だけでは物足りない・現金を投入するタイミングに迷う・ポートフォリオのリバランスを迷う、そんな局面で
        <strong>株温計は「意思決定の客観的裏付け」</strong>として活用できます。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          あなたが該当するなら
        </h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>30代〜40代で FIRE を目標にしている</li>
          <li>NISA 積立に加え、特定口座でまとまった金額を運用している</li>
          <li>年に数回〜数十回、手動のスポット買い・リバランスを行う</li>
          <li>現金比率を 10〜30% 程度持ち、「いつ追加するか」に迷っている</li>
          <li>オルカン・S&amp;P500 と日本株を両方持っている（または検討中）</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          なぜ FIRE 目指しの人に温度計が役立つのか
        </h2>
        <p className="leading-relaxed">
          長期投資の最大の敵は「待機資金の判断ミス」です。相場が順調なときほど追加投資に踏み切れず、暴落時は恐怖で動けない。結果として待機資金が何年も銀行口座に眠り、機会損失が積み上がります。
        </p>
        <p className="leading-relaxed mt-3">
          株温計は「今はどの程度の割安／割高か」を客観的に示します。
          <strong>暴落時こそ追加投資のチャンスであり、沸騰時こそリバランスのタイミング</strong>
          という原則を、感情ではなくスコアで裏付けられます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          温度帯 × FIRE目指しの行動指針
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-left font-semibold">長期投資アクション</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-semibold">極寒 (0-20)</td>
                <td className="px-3 py-2">
                  <strong>待機資金の大きな一部を投入する最大のチャンス。</strong>
                  年間の追加投資枠を前倒しで使う検討。歴史的に「極寒 → 3ヶ月後 +11.5%」の頻度が高い。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-semibold">冷え込み (21-40)</td>
                <td className="px-3 py-2">
                  ボーナスや現金比率の一部を少し多めに投入。分散エントリーで下げ余地に備える。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-semibold">平温 (41-60)</td>
                <td className="px-3 py-2">
                  通常の積立ペースを維持。追加投資はゆっくり。現金比率の大幅変更は不要。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-semibold">過熱 (61-80)</td>
                <td className="px-3 py-2">
                  <strong>リバランス点検のタイミング。</strong>
                  株式比率が目標より上振れているなら、一部を現金・債券へ。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap font-semibold">沸騰 (81-100)</td>
                <td className="px-3 py-2">
                  追加スポット買いは控える。利益確定・待機資金積み増しで次の極寒に備える。ただし全売りは NG（機会損失大）。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          日米両市場を持つ人向け：クロス分析の使い方
        </h2>
        <p className="leading-relaxed">
          オルカン・S&amp;P500 と日本株を両方持っているなら、トップページの
          <strong>「クロス分析」カード</strong>
          （米国温度 × 日経225 / 日本温度 × S&amp;P500）が参考になります。
        </p>
        <p className="leading-relaxed mt-3">
          例: 米国温度が極寒帯に入ると、歴史的には日経225 の 3 ヶ月後平均リターンも高くなりやすい傾向があります。
          これは日米市場の相関に由来する参考値ですが、
          <strong>「米国の恐怖は日本株にも買い場をもたらすことがある」</strong>
          という視点で使えます（純粋分離の同市場統計を主軸にしつつ補助的に参照してください）。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          シナリオ例：コロナショック時の「1年分前倒し」
        </h2>
        <p className="leading-relaxed">
          2020 年 3 月、株温計は日米ともに極寒帯。ここで「今年の追加投資枠の半分〜全額を前倒し投入」と決めた人と、「怖くて現金のまま」だった人では、数年後のポートフォリオに大きな差が出ました。
          <Link href="/events/covid-crash-sp500-2020" className="underline hover:text-gray-900">
            コロナショック底後の S&amp;P500 は 1 年で倍近く
          </Link>
          になっています。
        </p>
        <p className="leading-relaxed mt-3">
          <strong>極寒時の判断を、感情ではなく過去統計で補強する</strong>
          — これが株温計を長期投資に組み込む最大の価値です。
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
            で今日の温度・過去統計・クロス分析を確認
          </li>
          <li>
            <Link href="/events" className="underline hover:text-gray-900">
              主要イベント一覧
            </Link>
            で過去の大底とその後の長期リターンを確認
          </li>
          <li>
            <Link href="/guide" className="underline hover:text-gray-900">
              他の投資家タイプ別ガイド
            </Link>
            （NISA積立 / 短期トレーダー）
          </li>
        </ul>
      </section>

      <section>
        <p className="mt-8 text-xs text-gray-500 leading-relaxed">
          ※ 本ガイドは投資助言ではありません。FIRE
          達成までの運用方針はご自身のライフプラン・リスク許容度に合わせて決定してください。過去のリターンは将来の運用成果を保証するものではありません。
        </p>
      </section>
    </StaticPageLayout>
  );
}
