import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import EmbedCodeBlock from "./_components/EmbedCodeBlock";
import { buildEmbedSnippet } from "./_lib/embed-snippet";

export const metadata: Metadata = {
  title: "埋め込みウィジェット",
  description:
    "ブログや記事に株温計の「今日の市場温度」を 1 行で貼り付けられる無料の埋め込み画像ウィジェット。日本と米国の市場温度を自動更新。",
};

export default function WidgetPage() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  const absoluteImageUrl = `${siteUrl.replace(/\/+$/, "")}/widget/today`;
  const embedHtml = buildEmbedSnippet(siteUrl);

  return (
    <StaticPageLayout title="🧩 埋め込みウィジェット">
      <p>
        ブログや note、個人サイトに「株温計」の今日の市場温度を 1
        行で貼り付けられる無料ウィジェットです。貼るだけで毎日自動更新されます。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          プレビュー
        </h2>
        <div className="flex justify-center bg-gray-50 rounded-lg p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/widget/today"
            width={400}
            height={400}
            alt="株温計 - 今日の市場温度"
            className="rounded-lg shadow-md max-w-full h-auto"
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">
          サイズ: 400 × 400 px / 形式: PNG / 更新頻度: 約 15 分
        </p>
        <p className="mt-1 text-xs text-gray-500">
          本ウィジェットは株温計が公開データから独自計算した市場温度スコアを表示するもので、一次市場データ（価格・指数値等）を配信するものではありません。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          埋め込みコード
        </h2>
        <p className="mb-3 text-sm">
          下のコードをコピーして、貼りたい場所の HTML
          に貼り付けてください。
        </p>
        <EmbedCodeBlock code={embedHtml} />
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          使い方のヒント
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-sm">
          <li>
            <strong>WordPress / はてなブログ</strong>:
            「カスタム HTML」ブロックに貼り付け
          </li>
          <li>
            <strong>note</strong>:
            画像 URL として `{absoluteImageUrl}` をそのまま貼れば自動で表示されます
          </li>
          <li>
            <strong>X / Bluesky</strong>: 画像 URL
            をそのままツイートに含めれば OGP カードとして展開可能
          </li>
          <li>
            <strong>個人サイト / Markdown</strong>: `![株温計]({absoluteImageUrl})`
            形式でも動作します
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          ご利用について
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
          <li>
            個人・商用とも無料でご利用いただけます。利用登録は不要です
          </li>
          <li>
            画像の加工・改変はご遠慮ください。貼り付け元として
            <Link
              href="/"
              className="underline hover:text-gray-900 mx-1"
            >
              kabuonkei.com
            </Link>
            へのリンクを維持していただけると嬉しいです
          </li>
          <li>
            提供するスコアは情報提供を目的としており、投資助言ではありません。詳細は
            <Link
              href="/terms"
              className="underline hover:text-gray-900 mx-1"
            >
              利用規約
            </Link>
            をご確認ください
          </li>
          <li>
            サービス仕様・URL
            は予告なく変更する場合があります（大きな変更があった際は X アカウント等で告知します）
          </li>
        </ul>
      </section>
    </StaticPageLayout>
  );
}
