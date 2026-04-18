import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "株温計とは",
  description:
    "株温計は、日本市場と米国市場のセンチメント（恐怖・欲望）を1画面で俯瞰できる日本語Webサービスです。",
};

export default function AboutPage() {
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

      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        🌡 株温計とは
      </h1>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <p>
          株温計（かぶおんけい）は、「今日の相場、熱い？冷たい？」を一目で把握できる日本語ダッシュボードです。
          日本市場と米国市場のセンチメント指標を 1 画面で俯瞰できるよう設計しています。
        </p>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            できること
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>市場温度（日本版）</strong>: 日経225モメンタム、海外投資家フロー、信用倍率、裁定残バランス、ドル円モメンタムの 5 要素から算出した独自スコア
            </li>
            <li>
              <strong>Fear &amp; Greed（米国版）</strong>: CNN Fear &amp; Greed Index をベースに、S&amp;P500 に紐づくセンチメントを表示
            </li>
            <li>
              <strong>温度推移チャート</strong>: 過去データから算出した温度スコアの時系列（最大 10 年）
            </li>
            <li>
              <strong>過去の統計</strong>: 同じ温度帯だった過去の日経225 / S&amp;P500 の 1 / 3 / 6 ヶ月後リターン
            </li>
            <li>
              <strong>今日の類似日</strong>: 今日の温度に最も近かった過去日 TOP5 と、その日以降のリターンをナラティブで表示
            </li>
            <li>
              <strong>日本市場の需給</strong>: 投資主体別売買動向・裁定残・信用倍率（JPX 公開データ）
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            使い方
          </h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>トップ画面のゲージで今日の市場温度を把握する</li>
            <li>温度推移チャートで直近のトレンドを確認する</li>
            <li>「過去の統計」で同じ温度帯の過去リターンを眺める</li>
            <li>「今日の類似日」で過去の類似局面と照らし合わせる</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600">
            ※ 毎日チェックする必要はありません。相場が大きく動いた節目に開くとより役立ちます。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            データソース
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Yahoo Finance（主要指数・為替・VIX・日経平均 等）</li>
            <li>CNN Fear &amp; Greed Index（米国版センチメント）</li>
            <li>日本取引所グループ JPX 公開データ（投資主体別売買動向・裁定残・信用残）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            運営
          </h2>
          <p>
            株温計は個人によって運営されている非営利のサービスです。広告や有料機能は現時点で提供していません。
          </p>
          <p className="mt-2 text-sm text-gray-600">
            ご利用に際しては{" "}
            <Link href="/terms" className="underline hover:text-gray-900">
              利用規約
            </Link>
            {" "}と{" "}
            <Link href="/privacy" className="underline hover:text-gray-900">
              プライバシーポリシー
            </Link>
            {" "}をご確認ください。
          </p>
        </section>
      </div>
    </main>
  );
}
