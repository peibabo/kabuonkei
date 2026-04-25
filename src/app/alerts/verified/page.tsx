import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "温度アラート登録完了",
  description: "株温計 温度アラートの登録が完了しました。",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AlertsVerifiedPage({ searchParams }: Props) {
  const { error } = await searchParams;

  if (error === "expired") {
    return (
      <StaticPageLayout title="登録リンクの期限切れ">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-900">
            確認リンクの有効期限（24 時間）が切れています。お手数ですが、トップページから再度ご登録をお願いします。
          </p>
        </div>
        <p>
          <Link href="/" className="underline hover:text-gray-900">
            ← トップへ戻る
          </Link>
        </p>
      </StaticPageLayout>
    );
  }

  if (error) {
    return (
      <StaticPageLayout title="登録に失敗しました">
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-900">
            確認リンクが無効か、既に解除されています。お心当たりがない場合は、そのまま破棄してください。
          </p>
        </div>
        <p>
          <Link href="/" className="underline hover:text-gray-900">
            ← トップへ戻る
          </Link>
        </p>
      </StaticPageLayout>
    );
  }

  return (
    <StaticPageLayout title="温度アラート登録が完了しました">
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <p className="text-sm text-green-900 font-semibold">
          ✅ ご登録ありがとうございます
        </p>
        <p className="mt-2 text-sm text-green-800">
          選択いただいた温度（極寒 ≤20 / 過熱 ≥80）に市場が突入したタイミングでメールをお送りします。
        </p>
      </div>

      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">
          通知のタイミング
        </h2>
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
          <li>米国市場: 平日 07:00 JST（寄り前ブリーフィング）</li>
          <li>日本市場: 平日 17:15 JST（大引け後）</li>
          <li>
            前回が平温で、今回が極端域に突入した時のみ発火（連続発火なし・±5pt のヒステリシス付き）
          </li>
        </ul>
      </div>

      <p className="text-sm text-gray-600">
        配信解除は、いつでも通知メール末尾のリンクからワンクリックで可能です。
      </p>

      <p>
        <Link href="/" className="underline hover:text-gray-900">
          ← トップへ戻る
        </Link>
      </p>
    </StaticPageLayout>
  );
}
