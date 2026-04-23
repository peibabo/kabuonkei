import type { Metadata } from "next";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "株温計の利用規約。サービス内容・禁止事項・免責事項・準拠法を定めます。ご利用前に必ずお読みください。",
};

export default function TermsPage() {
  return (
    <StaticPageLayout title="利用規約">
      <p>
        本利用規約（以下「本規約」）は、リブラボ（以下「運営者」）が提供する株温計（以下「当サイト」）の利用条件を定めるものです。利用者は、当サイトを利用することで本規約に同意したものとみなされます。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          第 1 条（サービス内容）
        </h2>
        <p>
          当サイトは、市場のセンチメント指標・過去統計・将来リターンの履歴分析などを可視化する個人運営の情報提供サイトです。Yahoo Finance、CNN、日本取引所グループ（JPX）等が公開するデータをもとに、<strong>独自の計算ロジックで市場温度スコア（0-100）を算出</strong>して表示しています。
        </p>
        <p className="mt-3">
          本サイトは、一次市場データ（価格・指数値・為替レート等）を配信する商用データ提供サービスではありません。利用者に提供するのは当サイトが独自に集計・加工したスコアおよび当サイトが作成した解説コンテンツのみです。
        </p>
        <p className="mt-3 text-sm text-gray-600">
          各データソースの利用規約は将来変更される可能性があり、これに伴いサービス内容が変更または予告なく停止する場合があります。
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
          第 8 条（外部サービスへのリンクおよび広告表示）
        </h2>
        <p>
          当サイトの一部の記事・ページには、<strong>運営者が独自に調査した外部サービス（証券口座・書籍等）の公式ページへのリンク</strong>を掲載することがあります。これらのリンクは将来的に<strong>広告（アフィリエイトリンク）に切り替わる可能性</strong>があり、その場合には運営者が広告主から成果報酬を受け取ることになります。
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-3 text-sm">
          <li>
            広告（アフィリエイト）リンクを掲載する箇所には、「PR」「広告」「sponsored」等の表示を行います
          </li>
          <li>
            外部サービスの選定・紹介は、運営者の独立した判断に基づいて行われ、広告報酬の有無によって分析結果や解説コンテンツの中立性が左右されないよう努めています
          </li>
          <li>
            外部サービスの内容、ご契約条件、取引結果については各サービス提供事業者が責任を負うものであり、当サイトは一切の責任を負いません。お申込みはご自身の判断と責任で行ってください
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          第 9 条（お問い合わせ）
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

      <p className="text-sm text-gray-500 pt-6">最終改定日: 2026 年 4 月 23 日</p>
    </StaticPageLayout>
  );
}
