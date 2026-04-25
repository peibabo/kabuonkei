import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "温度アラート配信解除完了",
  description: "株温計 温度アラートの配信解除が完了しました。",
  robots: { index: false, follow: false },
};

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AlertsUnsubscribedPage({ searchParams }: Props) {
  const { error } = await searchParams;

  if (error) {
    return (
      <StaticPageLayout title="解除できませんでした">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm text-amber-900">
            解除リンクが無効です。既に解除済みの可能性もあります。お手数ですがメール末尾のリンクからお試しください。
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
    <StaticPageLayout title="配信解除が完了しました">
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-900 font-semibold">
          今後、温度アラートメールはお送りしません。
        </p>
        <p className="mt-2 text-sm text-gray-700">
          ご登録いただいていたメールアドレスの情報はシステムから削除されました。
        </p>
      </div>

      <p className="text-sm text-gray-600">
        またのご利用をお待ちしております。再登録はトップページからいつでも可能です。
      </p>

      <p>
        <Link href="/" className="underline hover:text-gray-900">
          ← トップへ戻る
        </Link>
      </p>
    </StaticPageLayout>
  );
}
