import type { Metadata } from "next";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "株温計のプライバシーポリシー。アクセス解析および Cookie の利用方針について記載しています。",
};

export default function PrivacyPage() {
  return (
    <StaticPageLayout title="プライバシーポリシー">
      <p>
        株温計（運営: リブラボ、以下「当サイト」）は、ユーザーのプライバシーを尊重し、個人情報の取り扱いについて以下のとおり定めます。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          1. 取得する情報
        </h2>
        <p>
          当サイトでは、サービス改善および利用状況の把握のため、以下の情報を自動的に取得する場合があります。
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>アクセス元の IP アドレス（匿名化された形で Google Analytics 上に記録）</li>
          <li>ブラウザ種別・OS・画面解像度・リファラー</li>
          <li>ページ閲覧履歴・滞在時間</li>
          <li>Cookie（後述）</li>
        </ul>
        <p className="mt-3">
          また、温度アラート（メール通知）にご登録いただいた方に限り、以下の情報をご本人の任意提供により取得し、当サイトの管理下で保存します。
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>メールアドレス</li>
          <li>通知対象（米国/日本 × 極寒/過熱）の選択状態</li>
          <li>登録日時・確認日時・配信履歴・配信状態（有効／解除済み）</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          2. 利用目的
        </h2>
        <p>取得した情報は次の目的のみに利用します。</p>
        <ul className="list-disc pl-6 space-y-1 mt-2">
          <li>サービスの品質改善・不具合対応</li>
          <li>アクセス状況の分析および統計作成</li>
          <li>不正利用の防止</li>
          <li>温度アラートメールの配信（ご登録いただいたメールアドレスに対してのみ）</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          3. Cookie とアクセス解析
        </h2>
        <p>
          当サイトでは、利用状況の把握のため Google LLC が提供するアクセス解析ツール「Google Analytics 4（GA4）」を使用する場合があります。GA4 は Cookie を用いて匿名のトラフィック情報を収集します。収集されるデータは匿名であり、個人を特定するものではありません。なお、GA4 では IP アドレスはログとして保存されません。
        </p>
        <p className="mt-2">
          Google Analytics の利用規約については{" "}
          <a
            href="https://marketingplatform.google.com/about/analytics/terms/jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900"
          >
            こちら
          </a>
          、プライバシーポリシーは{" "}
          <a
            href="https://policies.google.com/privacy?hl=ja"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900"
          >
            こちら
          </a>
          をご確認ください。
        </p>
        <p className="mt-2">
          計測を停止したい場合は、Google が提供する{" "}
          <a
            href="https://tools.google.com/dlpage/gaoptout?hl=ja"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-900"
          >
            Google アナリティクス オプトアウト アドオン
          </a>
          をブラウザにインストールすることで、当サイトを含む GA4 利用サイト全体の計測を無効化できます。
        </p>
        <p className="mt-2">
          Cookie はブラウザの設定により無効化することも可能です。Cookie を無効化してもサイトの主要機能はご利用いただけます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          4. 第三者提供
        </h2>
        <p>
          当サイトは、法令に基づく開示請求がある場合を除き、取得した情報を第三者に提供・販売することはありません。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          5. 外部サービスへのリンク
        </h2>
        <p>
          当サイトは外部サービス（Yahoo Finance、CNN、JPX 等）から取得したデータを表示することがあります。これら外部サービスにおける情報の取り扱いについては、各サービスのプライバシーポリシーをご確認ください。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          6. 改定
        </h2>
        <p>
          本ポリシーは必要に応じて改定されることがあります。重要な変更がある場合は、当サイト上で告知します。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          7. メール通知（温度アラート）の登録・解除
        </h2>
        <p>
          温度アラートのご登録はトップページの登録フォームから任意で行っていただけます。ご登録後、確認メールのリンクをクリックして完了する二段階確認方式を採用しています。
        </p>
        <ul className="list-disc pl-6 space-y-1 mt-3">
          <li>
            配信の解除はメール末尾の「配信解除」リンクをクリックすることで即時に反映されます
          </li>
          <li>
            解除後、登録いただいたメールアドレスおよび関連情報はシステムから速やかに削除されます。再登録時の誤発火防止用にメールアドレスのハッシュ値（元の値は復元不可）のみを最長 365 日間保持する場合があります
          </li>
          <li>
            メールの配信には、業務委託先として Resend（Resend, Inc.）のサービスを利用します。Resend のプライバシーポリシーは{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              こちら
            </a>
            をご確認ください
          </li>
          <li>
            登録情報の保管には Upstash（Upstash, Inc.）の提供するデータベースサービスを業務委託先として利用します
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          8. お問い合わせ
        </h2>
        <p>
          本ポリシーに関するお問い合わせ、個人関連情報の取り扱いについてのご質問は、下記までご連絡ください。
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
