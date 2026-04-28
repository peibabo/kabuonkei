import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-margin-ratio";
const ARTICLE_TITLE =
  "信用倍率とは？見方・水準別の意味と、温度スコアと組み合わせて読むコツ";
const ARTICLE_DESCRIPTION =
  "信用倍率（信用買い残÷信用売り残）の意味、JPX 公表データの読み方、「4 倍超え=過熱」という通説の真偽、株温計の温度スコアと組み合わせた使いどころを初心者向けに解説。週次データなのに毎週見るべきかという素朴な疑問にも答えます。";
const PUBLISHED_AT = "2026-04-28";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "信用倍率 とは",
    "信用倍率 見方",
    "信用倍率 目安",
    "信用倍率 4倍",
    "信用買い残",
    "信用売り残",
    "JPX",
    "需給",
    "株温計",
  ],
  openGraph: {
    title: `${ARTICLE_TITLE} | 株温計`,
    description: ARTICLE_DESCRIPTION,
    type: "article",
    url: ARTICLE_PATH,
    locale: "ja_JP",
  },
  alternates: {
    canonical: ARTICLE_PATH,
  },
};

const TOC_ITEMS = [
  { href: "#tldr", label: "結論を先に" },
  { href: "#what", label: "信用倍率とは何か" },
  { href: "#bands", label: "水準別の意味（経験則の目安）" },
  { href: "#myth", label: "「4 倍超え＝危険」は本当か" },
  { href: "#pitfalls", label: "見方の注意点 4 つ" },
  { href: "#temperature", label: "温度スコアとの関係（株温計 C4 要素）" },
  { href: "#where", label: "毎週どこで確認できるか" },
  { href: "#related", label: "関連用語・関連記事" },
];

const BANDS = [
  {
    range: "0.5 倍未満",
    label: "売り方が買い方を上回る",
    detail:
      "売り残が買い残を上回る稀な水準。空売りの買い戻しで上昇する「踏み上げ相場」の起点になりやすい",
  },
  {
    range: "1 倍前後",
    label: "拮抗",
    detail:
      "買い方と売り方がほぼ釣り合う。底入れ局面の途中で目にすることが多い",
  },
  {
    range: "2〜3 倍",
    label: "通常レンジ",
    detail:
      "歴史的にもっとも多く観察されるゾーン。需給的には買い方やや優勢が定常状態",
  },
  {
    range: "3〜4 倍",
    label: "やや過熱",
    detail:
      "上昇相場が長く続いて買い方が積み上がってきた状態。注意は必要だが即時の警報レベルではない",
  },
  {
    range: "4 倍超",
    label: "過熱（経験則）",
    detail:
      "「4 倍超えで天井圏」という経験則が広く語られるゾーン。ただし株温計の検証では単独指標としては弱め",
  },
];

export default function WhatIsMarginRatioPage() {
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: PUBLISHED_AT,
  });

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "解説記事", path: "/learn" },
    { name: "信用倍率とは" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="article-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="article-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={ARTICLE_TITLE}>
        <Breadcrumb items={breadcrumbItems} />

        <p className="text-xs text-gray-500 not-prose">
          公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>
          {" / "}
          短い定義だけ確認したい場合は{" "}
          <Link
            href="/glossary#margin-ratio"
            className="underline hover:text-gray-700"
          >
            用語集「信用倍率」
          </Link>
          へ。
        </p>

        <nav
          aria-label="目次"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm not-prose"
        >
          <p className="font-semibold text-gray-700 mb-2">📑 目次</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-none pl-0">
            {TOC_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section
          id="tldr"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">
            📖 結論を先に
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base text-gray-800 leading-relaxed">
            <li>
              <strong>信用倍率</strong> = 信用買い残 ÷ 信用売り残。日本取引所グループ（JPX）が
              <strong>毎週水曜日 15:00</strong> に前週末（金曜日引け時点）の数字を公表している、週次の需給指標
            </li>
            <li>
              通称<strong>「4 倍を超えると過熱」</strong>と語られますが、株温計が過去 10 年データで検証したところ、
              単独指標としては<strong>意外と頼りない</strong>シグナルでした
            </li>
            <li>
              本領発揮するのは<strong>「市場温度との組合せ」</strong>。株温計は信用倍率を C4 要素として、
              他 4 要素（モメンタム・需給・外国人フロー・為替）と等ウェイトで統合した日本版温度スコアを毎日公開しています
            </li>
            <li>
              週次更新であることを忘れないこと、SQ 前後の歪みに注意すること。本記事では見方の注意点 4 つも整理します
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            信用倍率とは何か
          </h2>
          <p className="text-base leading-relaxed">
            <strong>信用倍率</strong>は、株式市場の<strong>「信用取引でいま買い建てしている人」と「売り建てしている人」のバランス</strong>を表す需給指標です。
            計算式はシンプルで、
          </p>
          <p className="text-base leading-relaxed mt-2 text-center bg-gray-50 border border-gray-200 rounded-lg p-3 not-prose">
            <strong>信用倍率 = 信用買い残 ÷ 信用売り残</strong>
          </p>
          <p className="text-base leading-relaxed mt-3">
            <strong>信用買い残</strong>とは「証券会社からお金を借りて株を買い、まだ返済していないポジションの総額」、
            <strong>信用売り残</strong>はその逆で「証券会社から株を借りて売り、まだ買い戻していないポジションの総額」です。
            倍率が大きいほど買い建てが優勢、小さいほど売り建てが優勢、ということになります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            日本取引所グループ（JPX）は、東証・名証の二市場を合算した信用取引週末残高を{" "}
            <strong>毎週水曜日 15:00</strong>{" "}
            に前週末（金曜日引け時点）の数字として公表します。週次データであり、リアルタイムの動きを追える指標ではありません。
            個別銘柄の数字も合わせて公表されますが、本記事では市場全体（二市場合計）の信用倍率を扱います。
          </p>
        </section>

        <section id="bands" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            水準別の意味（経験則の目安）
          </h2>
          <p className="text-base leading-relaxed">
            信用倍率に厳密な「閾値」はありません。ただし長年語られている経験則ベースの目安は以下の通りです。
            あくまで参考レベルで、絶対的な売買シグナルではない点には常に留意してください。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">水準</th>
                  <th className="px-3 py-2 text-left font-semibold">市場の状態</th>
                  <th className="px-3 py-2 text-left font-semibold">読み方</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                {BANDS.map((b) => (
                  <tr key={b.range}>
                    <td className="font-mono whitespace-nowrap">{b.range}</td>
                    <td className="font-semibold text-gray-800">{b.label}</td>
                    <td className="text-gray-700">{b.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            ポイントは<strong>「信用倍率は 1 倍未満が稀」</strong>ということ。
            日本市場では構造的に信用買いの方がボリュームが大きく、平時の通常レンジは 2〜3 倍に固まります。
            1 倍を割り込むケースは、リーマンショックやコロナショック直後の悲観極期など、
            <strong>かなり珍しい局面に限定</strong>される、という前提でデータを眺めると感覚が掴みやすくなります。
          </p>
        </section>

        <section id="myth" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            「4 倍超え＝危険」は本当か？
          </h2>
          <p className="text-base leading-relaxed">
            投資雑誌や掲示板で<strong>「信用倍率 4 倍超えは天井圏のサイン」</strong>と語られるのをよく目にします。
            背景にある理屈は明快で、<strong>買い建ての人がたくさん溜まっている＝将来の解消売り（決済売り）圧力が積み上がっている</strong>、
            だから天井が近い、というロジックです。直感的にはもっともらしい。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ただし、<strong>過去 10 年のデータを並べると、この経験則は単独では意外と頼りない</strong>ことが分かります。
            株温計では JPX 公表データと日経225 終値を週次で組み合わせ、信用倍率の水準ごとに翌 1 / 3 / 6 ヶ月後のリターンを集計しました。
            結論として、信用倍率の水準だけ見ても、その後のリターンとの間に強い関係性は見出しにくい——というのが正直な検証結果です。
          </p>
          <p className="text-base leading-relaxed mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            🔬 単独では弱いが、<strong>株温計の温度スコアと掛け合わせると読み方が変わる組合せ</strong>があります。
            水準別の集計表・温度との二軸クロス・サンプル数まで含めた全データは{" "}
            <Link
              href="/analysis/margin-ratio-temperature"
              className="underline hover:text-gray-900"
            >
              「信用倍率 × 株温計 — 過去10年の徹底検証」
            </Link>
            で公開しています。本記事ではそのエッセンスのみを引用し、検証ロジックの全文はそちらに委ねます。
          </p>
        </section>

        <section id="pitfalls" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            見方の注意点 4 つ
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>週次データである</strong>: 毎週水曜日 15:00 公表で、しかも前週金曜日時点のスナップショット。
              「いま」の数字ではなく<strong>「3〜5 営業日前」の数字</strong>を見ている、という時差を意識してください。
              急変相場ではこの時差が致命的になりえます
            </li>
            <li>
              <strong>SQ 前後の歪みに注意</strong>: 先物・オプションの清算日（SQ）前後では裁定取引や
              ヘッジポジションの解消で信用残が一時的に増減することがあります。週単位で見ているとノイズになりやすい局面です
            </li>
            <li>
              <strong>個別銘柄と市場全体は別物</strong>: 仕手株や材料株の信用倍率は個別の事情で大きく振れます。
              本記事で扱っている目安はあくまで<strong>市場全体（二市場合計）</strong>の話。
              個別銘柄判断にそのまま流用するのは危険です
            </li>
            <li>
              <strong>他指標との併用を前提にする</strong>: 信用倍率だけで売買判断するのではなく、
              {" "}
              <Link
                href="/glossary#arbitrage-balance"
                className="underline hover:text-gray-900"
              >
                裁定残
              </Link>
              、{" "}
              <Link
                href="/glossary#investor-type-trading"
                className="underline hover:text-gray-900"
              >
                投資主体別売買動向
              </Link>
              、{" "}
              <Link
                href="/glossary#kabuonkei-score"
                className="underline hover:text-gray-900"
              >
                市場温度スコア
              </Link>
              などと組み合わせて、複数の角度から需給を見る習慣をつけるのがおすすめです
            </li>
          </ol>
        </section>

        <section id="temperature" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            温度スコアとの関係（株温計 C4 要素）
          </h2>
          <p className="text-base leading-relaxed">
            株温計の<strong>日本版「市場温度スコア」</strong>は、5 つの要素を等ウェイトで統合した独自指標です。
            信用倍率はそのうちの<strong>C4 要素</strong>として組み込まれています。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">要素</th>
                  <th className="px-3 py-2 text-left font-semibold">中身</th>
                  <th className="px-3 py-2 text-left font-semibold">信用倍率との関係</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-semibold">C1</td>
                  <td>日経225 の 125 日移動平均との乖離率</td>
                  <td>長期トレンド面（信用倍率と独立）</td>
                </tr>
                <tr>
                  <td className="font-semibold">C2</td>
                  <td>裁定残バランス</td>
                  <td>同じ「需給系」で補完関係</td>
                </tr>
                <tr>
                  <td className="font-semibold">C3</td>
                  <td>外国人投資家フロー</td>
                  <td>主体（外国人）視点で補完</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="font-semibold">C4</td>
                  <td>信用倍率</td>
                  <td>本記事の主題（個人投資家のポジション偏り）</td>
                </tr>
                <tr>
                  <td className="font-semibold">C5</td>
                  <td>USDJPY 50 日モメンタム</td>
                  <td>マクロ要因（信用倍率と独立）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            ねらいは<strong>「信用倍率の弱さを他要素で補強する」</strong>こと。
            信用倍率は単独では精度が出にくい一方、<strong>需給系（C2）と主体（C3）と組み合わさるとシグナルとしての強さが増す</strong>
            傾向があります。株温計の温度スコアは「信用倍率も見ているが、それだけに頼っていない」という設計です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            日々の温度スコアは{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページ
            </Link>
            のゲージで一目把握できます。
            毎週の信用倍率の生データを直接眺める手間をかけずに、
            「市場が熱いか冷たいか」を 0〜100 のひとつの数字で読めるようにしているのが温度スコアの役割です。
          </p>
        </section>

        <section id="where" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            毎週どこで確認できるか
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong>JPX 公式</strong>:{" "}
              <a
                href="https://www.jpx.co.jp/markets/statistics-equities/margin/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-900"
              >
                信用取引残高等
              </a>
              {" "}— 毎週水曜日 15:00 に最新データが掲載される一次情報源
            </li>
            <li>
              <strong>大手証券各社の市場情報サイト</strong>: 楽天証券・SBI 証券・SMBC 日興証券などが二次情報として時系列をグラフ化
            </li>
            <li>
              <strong>株温計のトップページ</strong>: 日本市場データセクションで最新の信用倍率と推移、
              および温度スコアの C4 要素として組み込まれた数値を表示
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            毎週水曜日に必ず数字を追う必要はありません。<strong>節目の水準（4 倍超え、1 倍割れ）を超えたとき</strong>だけ
            意識する、という頻度で十分です。極端水準のときに気付ける仕組みとして、株温計の{" "}
            <Link href="/alerts" className="underline hover:text-gray-900">
              温度メールアラート
            </Link>
            （温度スコア ≤20 / ≥80 で通知）も活用してください。
          </p>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              用語集:{" "}
              <Link
                href="/glossary#margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#arbitrage-balance"
                className="underline hover:text-gray-900"
              >
                裁定残
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#investor-type-trading"
                className="underline hover:text-gray-900"
              >
                投資主体別売買動向
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#kabuonkei-score"
                className="underline hover:text-gray-900"
              >
                市場温度スコア
              </Link>
            </li>
            <li>
              解説記事:{" "}
              <Link
                href="/learn/what-is-fear-greed"
                className="underline hover:text-gray-900"
              >
                Fear &amp; Greed Index とは？
              </Link>
              {" "}/{" "}
              <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
                VIX（恐怖指数）とは？
              </Link>
            </li>
            <li>
              分析記事:{" "}
              <Link
                href="/analysis/margin-ratio-temperature"
                className="underline hover:text-gray-900"
              >
                信用倍率 × 株温計 — 過去10年の徹底検証
              </Link>
            </li>
            <li>
              トップ:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                今日の市場温度・信用倍率を確認する
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は信用倍率という指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。引用している統計・経験則は過去データの集計および市場の慣習であり、将来の運用成果を保証するものではありません。
            投資判断はご自身のリスク許容度に応じて行ってください。データ出典: 日本取引所グループ（JPX）「信用取引残高等」、Yahoo Finance ^N225。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
