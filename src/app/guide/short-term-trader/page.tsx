import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";

export const metadata: Metadata = {
  title: "短期トレーダーが株温計をどう使うか",
  description:
    "デイトレ・スイングトレーダーにとって株温計は「マクロセンチメントの偏り」を測る地合い判定ツールです。沸騰／極寒ごとのポジション傾け方と、類似日機能でシナリオを立てる使い方を解説します。",
  openGraph: {
    title: "短期トレーダーが株温計をどう使うか | 株温計",
    description:
      "地合い判定・逆張り・順張りの温度帯別判断。類似日機能で過去の類似局面と比較する使い方。",
  },
  alternates: {
    canonical: "/guide/short-term-trader",
  },
};

export default function ShortTermTraderGuidePage() {
  return (
    <StaticPageLayout title="⚡ 短期トレーダーが株温計をどう使うか">
      <p className="text-base leading-relaxed">
        日々個別銘柄のチャートや需給を追っている短期トレーダーにとって、温度計は「マクロセンチメントの偏り」を一瞥で測るための地合い判定ツールです。
        個別銘柄の強弱だけを見ていると、<strong>マーケット全体の偏りで自分のポジションが踏まれる</strong>経験はつきもの。その偏りを可視化するのが株温計の役割です。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          あなたが該当するなら
        </h2>
        <ul className="list-disc pl-6 space-y-1 text-sm">
          <li>デイトレ・スイングで日経225先物 / 個別株 / ETF を取引している</li>
          <li>信用取引やレバレッジ ETF を併用している</li>
          <li>地合いを感覚で判断しがちで、客観的な指標がほしい</li>
          <li>「天井で買い直された」「底で投げた」経験がある</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          なぜ短期トレーダーに温度計が役立つのか
        </h2>
        <p className="leading-relaxed">
          短期トレードでは、チャートとテクニカル・需給を中心に判断することが多いはずです。ただ、
          <strong>マクロセンチメントの偏りが極端な局面</strong>
          ではチャートのセオリーが一時的に通用しなくなります。沸騰帯での「調整売り」、極寒帯での「狼狽投売り」は、短期ポジションにとって最大のリスクであり同時に最大のチャンスでもあります。
        </p>
        <p className="leading-relaxed mt-3">
          温度計は感覚的な「地合い判定」を 0-100 の具体数値に落とし込みます。
          <strong>「今は地合いに逆らうな」「今は逆張り有利」</strong>のような大枠判断に使えます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          温度帯 × 短期トレーダーの行動指針
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-left font-semibold">地合いの特徴</th>
                <th className="px-3 py-2 text-left font-semibold">ポジションの傾け方</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">極寒 (0-20)</td>
                <td className="px-3 py-2">狼狽売り・投売りが出やすい</td>
                <td className="px-3 py-2">
                  <strong>逆張り・押し目買い候補</strong>。ショートは高リスク。反発時の戻り幅が大きくなりやすい。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">冷え込み (21-40)</td>
                <td className="px-3 py-2">悲観優勢・ボラティリティ高め</td>
                <td className="px-3 py-2">
                  押し目買いゾーン。ただし戻り売りも重いので分割エントリーで。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">平温 (41-60)</td>
                <td className="px-3 py-2">地合いニュートラル</td>
                <td className="px-3 py-2">
                  テクニカル優先。トレンドフォロー・レンジトレードどちらも有効。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">過熱 (61-80)</td>
                <td className="px-3 py-2">楽観優勢・押し目限定的</td>
                <td className="px-3 py-2">
                  買い傾きを抑える。利確優先、新規ロングは<strong>リスク限定</strong>で。
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">沸騰 (81-100)</td>
                <td className="px-3 py-2">FOMO・追随買い・踏み上げ終盤</td>
                <td className="px-3 py-2">
                  <strong>新規ロングは慎重</strong>。利確のタイミング。戻り売り候補を準備。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          「今日の類似日」でシナリオを立てる
        </h2>
        <p className="leading-relaxed">
          短期トレーダーにとって強力なのが「今日の類似日」機能です。これは
          <strong>今日と最も温度が近かった過去日 TOP5</strong>と、その日以降の 1M/3M/6M リターンを表示する機能。
          過去の同じ地合いで「その後どう動いたか」のパターンを瞬時に参照できます。
        </p>
        <p className="leading-relaxed mt-3">
          例: 「今日の温度=85。過去の類似日は 2024 年 7 月 19 日（令和のブラックマンデー直前）、2017 年 11 月 7 日（...）…」
          のように、過去の局面がイベント名と一緒に出てくるので、<strong>今が『調整前の天井圏』なのか『健全な上昇の途中』なのか</strong>
          の肌感覚を過去データで補強できます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          シナリオ例：令和のブラックマンデー後の反発
        </h2>
        <p className="leading-relaxed">
          2024 年 8 月 5 日の令和のブラックマンデーでは、日本版温度が極寒帯に突入しました。総悲観ムードの中で投売りが出ましたが、
          <Link href="/events/reiwa-black-monday-2024" className="underline hover:text-gray-900">
            その後の 3 ヶ月間で日経225 は大きく反発
          </Link>
          しています。極寒帯での短期リバウンド狙いは、株温計を使った典型的な逆張りシナリオです。
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
            で今日の温度・類似日・過去統計を確認
          </li>
          <li>
            <Link href="/events" className="underline hover:text-gray-900">
              主要イベント一覧
            </Link>
            で暴落・反発パターンを時系列で確認
          </li>
          <li>
            <Link
              href="/analysis/margin-ratio-temperature"
              className="underline hover:text-gray-900"
            >
              信用倍率 × 株温計 — 過去10年の検証
            </Link>
            で需給と温度のクロス集計を深掘り
          </li>
          <li>
            <Link href="/guide" className="underline hover:text-gray-900">
              他の投資家タイプ別ガイド
            </Link>
            （NISA積立 / FIRE目指し）
          </li>
        </ul>
      </section>

      <section>
        <p className="mt-8 text-xs text-gray-500 leading-relaxed">
          ※ 本ガイドは投資助言ではありません。短期トレードは自己責任でお願いします。信用取引・レバレッジ商品は損失が投資元本を上回る可能性があります。過去のリターンは将来の運用成果を保証するものではありません。
        </p>
      </section>
    </StaticPageLayout>
  );
}
