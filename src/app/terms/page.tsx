import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "株温計の利用規約。サービス内容・禁止事項・免責事項・準拠法を定めます。ご利用前に必ずお読みください。",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <nav className="mb-8">
        <Link
          href="/"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← トップへ戻る
        </Link>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">利用規約</h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          本利用規約（以下「本規約」）は、株温計（以下「当サイト」）が提供するサービスの利用条件を定めるものです。利用者は、当サイトを利用することで本規約に同意したものとみなされます。
        </p>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 1 条（サービス内容）
          </h2>
          <p>
            当サイトは、市場のセンチメント指標・過去統計・将来リターンの履歴分析などを可視化する情報提供サービスです。情報は Yahoo Finance、CNN、日本取引所グループ（JPX）等が公開するデータをもとに自動集計・加工のうえ表示しています。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 2 条（免責事項）
          </h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-2">
            <p className="font-bold text-amber-900 mb-2">重要</p>
            <ul className="list-disc pl-6 space-y-2 text-amber-900">
              <li>
                当サイトは <strong>情報提供を目的としたものであり、特定の金融商品の売買を推奨・勧誘するものではありません</strong>。金融商品取引法上の投資助言・投資勧誘には該当しません。
              </li>
              <li>
                掲載する情報の正確性・完全性・最新性については最善を尽くしますが、これらを保証するものではありません。データ取得元の遅延・エラー・仕様変更により情報が実際と異なる場合があります。
              </li>
              <li>
                当サイトに掲載された情報・分析結果に基づいて利用者が行った投資判断の結果、または当サイトの利用に関連して発生した一切の損害について、当サイトは責任を負いません。
              </li>
              <li>
                <strong>投資判断は必ず利用者ご自身の責任と判断で行ってください。</strong>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 3 条（禁止事項）
          </h2>
          <p>利用者は、当サイトの利用にあたり以下の行為をしてはなりません。</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>法令または公序良俗に違反する行為</li>
            <li>当サイトのサーバー・ネットワークに過度な負荷をかける行為（連続的な自動アクセス等）</li>
            <li>当サイトの運営を妨害する行為</li>
            <li>当サイトから取得したデータ・コンテンツを、出典を明示せず商用目的で再配布する行為</li>
            <li>その他、当サイトが不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 4 条（知的財産権）
          </h2>
          <p>
            当サイトに掲載されたコンテンツ（テキスト・デザイン・コード等）の著作権は、当サイト運営者または原著作者に帰属します。引用の範囲を超える転載を希望する場合は事前にお問い合わせください。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 5 条（サービスの変更・中断・終了）
          </h2>
          <p>
            当サイトは、利用者への事前通知なく、サービス内容の変更・一時的な中断・終了を行うことがあります。これに起因して利用者に損害が生じた場合でも、当サイトは責任を負いません。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 6 条（規約の変更）
          </h2>
          <p>
            本規約は必要に応じて変更されることがあります。変更後の規約は、当サイトに掲載した時点から効力を生じます。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 7 条（準拠法・管轄）
          </h2>
          <p>
            本規約の解釈および適用は日本法に準拠します。当サイトに関して紛争が生じた場合は、当サイト運営者の所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            第 8 条（お問い合わせ）
          </h2>
          <p>
            本規約に関するお問い合わせ、コンテンツの転載許諾、その他のご連絡は下記までお願いします。
          </p>
          <p className="mt-2">
            連絡先:{" "}
            <a
              href="mailto:info@kabuonkei.com"
              className="underline hover:text-gray-900"
            >
              info@kabuonkei.com
            </a>
          </p>
        </section>

        <p className="text-sm text-gray-500 pt-6">最終改定日: 2026 年 4 月 19 日</p>
      </div>
    </main>
  );
}
