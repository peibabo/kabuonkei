import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const PAGE_PATH = "/glossary";
const PAGE_TITLE = "株温計の用語集";
const PAGE_DESCRIPTION =
  "VIX・日経VI・Fear & Greed Index・信用倍率・裁定残・投資主体別売買動向・市場温度スコアなど、株温計が扱う指標をまとめて解説。各用語の定義と「株温計での扱い」を 1 ページにまとめた用語集。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "VIX とは",
    "日経VI",
    "Fear and Greed Index",
    "恐怖指数",
    "信用倍率",
    "裁定残",
    "投資主体別売買動向",
    "市場温度スコア",
    "株温計",
    "DCA",
    "ドローダウン",
    "用語集",
  ],
  openGraph: {
    title: `${PAGE_TITLE} | 株温計`,
    description: PAGE_DESCRIPTION,
    type: "article",
    url: PAGE_PATH,
    locale: "ja_JP",
  },
  alternates: {
    canonical: PAGE_PATH,
  },
};

interface GlossaryTerm {
  /** ページ内アンカー id */
  id: string;
  term: string;
  /** 簡易ラベル（目次用） */
  shortLabel?: string;
}

const TERMS: GlossaryTerm[] = [
  { id: "vix", term: "VIX（恐怖指数）" },
  { id: "nikkei-vi", term: "日経VI（日経平均ボラティリティー・インデックス）" },
  { id: "fear-greed-index", term: "Fear & Greed Index（CNN 恐怖と欲望指数）" },
  { id: "kabuonkei-score", term: "市場温度スコア（株温計の独自指標）" },
  { id: "margin-ratio", term: "信用倍率" },
  { id: "arbitrage-balance", term: "裁定残（裁定買い残・裁定売り残）" },
  { id: "investor-type-trading", term: "投資主体別売買動向" },
  { id: "usdjpy-momentum", term: "ドル円モメンタム" },
  { id: "drawdown", term: "ドローダウン（DD）と最大ドローダウン" },
  { id: "dca", term: "DCA（ドルコスト平均法）" },
  { id: "nisa", term: "新NISA（少額投資非課税制度）" },
  { id: "similar-days", term: "類似日（Similar Days）" },
];

export default function GlossaryPage() {
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "用語集" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="glossary-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={`📖 ${PAGE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-base">
          株温計が扱う指標と、関連するセンチメント・需給用語の定義をまとめています。各用語のあとに、株温計のどのページでどう使われているかを記しているので、
          サイト内の関連コンテンツへの入口としても利用できます。
        </p>

        <nav
          aria-label="用語一覧"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm not-prose"
        >
          <p className="font-semibold text-gray-700 mb-2">📑 索引</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-none pl-0">
            {TERMS.map((t) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {t.shortLabel ?? t.term}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <section id="vix" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            VIX（恐怖指数）
          </h2>
          <p className="text-base leading-relaxed">
            VIX は米シカゴ・オプション取引所（CBOE）が算出・公表する指数で、S&amp;P500 オプションの価格から逆算した
            <strong>「向こう 30 日の予想変動率（IV、年率換算）」</strong>を示します。S&amp;P500 のオプション価格が高くなる＝投資家が不安に備えて
            ヘッジを買う動きが強まると VIX は上昇し、平常時は低下します。1990 年以降、平均は概ね 19 前後。
            <strong> 20 以下で平静、30 を超えると不安、40 を超えるとパニック</strong>と大づかみに読まれることが多い指標です。
            ティッカーは <code className="text-sm bg-gray-100 px-1 rounded">^VIX</code>。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計では、米国版「市場温度」を VIX から線形推定する主系列として採用しています。VIX をスコア 0〜100 に変換した結果と、
            Fear &amp; Greed Index の値はおおむね逆相関の関係にあり、VIX が高い局面ほど温度は冷たくなります。
            初心者向けの腰を据えた解説は{" "}
            <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
              「VIX（恐怖指数）とは？」
            </Link>
            、VIX 水準別のリターン検証は{" "}
            <Link href="/analysis/vix-threshold-sp500" className="underline hover:text-gray-900">
              「VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？」
            </Link>
            にまとめています。
          </p>
        </section>

        <section id="nikkei-vi" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            日経VI（日経平均ボラティリティー・インデックス）
          </h2>
          <p className="text-base leading-relaxed">
            日経VI は日本取引所グループ（JPX）が公表する、日経225 オプションの価格から逆算した<strong>日本版の予想変動率指数</strong>です。
            考え方は VIX と同じで、向こう 30 日の年率換算 IV を表します。日経225 が急落するときに上昇しやすく、平常時は低位に張り付く性質があります。
            ティッカーは公表上 <code className="text-sm bg-gray-100 px-1 rounded">^JNV</code> ですが、Yahoo Finance では正式に提供されておらず、
            個人サイトで完全にトラッキングするには JPX 直接配信や J-Quants 等の別データソースが必要です。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計の本体スコアは日経VI を直接参照していませんが、将来的な拡張候補として日本版「恐怖指数」要素の検討対象に位置付けています。
          </p>
        </section>

        <section id="fear-greed-index" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            Fear &amp; Greed Index（CNN 恐怖と欲望指数）
          </h2>
          <p className="text-base leading-relaxed">
            CNN Business が公開している<strong>米国株市場のセンチメント指数</strong>で、株価モメンタム・出来高・優良債と低格付債のスプレッド・
            プット/コール比率・VIX・市場ボラティリティ・セーフヘイブン需要の 7 要素を統合し、
            <strong> 0（極度の恐怖）〜 100（極度の欲望）</strong>の値で公表されます。一般的な目安は 0〜25 が「Extreme Fear」、
            25〜45 が「Fear」、45〜55 が「Neutral」、55〜75 が「Greed」、75〜100 が「Extreme Greed」。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計の米国版温度はこの指数のコンセプトに着想を得ています。CNN 公式 API はサーバーサイドからの取得が bot 検知でブロックされるため、
            現時点では VIX ベースの線形推定値を主系列として表示しています（同等の方向感は得られます）。
            7 要素の構成・日本版を独自に作った経緯は{" "}
            <Link
              href="/learn/what-is-fear-greed"
              className="underline hover:text-gray-900"
            >
              「Fear &amp; Greed Index とは？CNN 米国版の中身と、日本版を株温計でどう作っているか」
            </Link>
            で解説しています。
          </p>
        </section>

        <section id="kabuonkei-score" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            市場温度スコア（株温計の独自指標）
          </h2>
          <p className="text-base leading-relaxed">
            <strong>市場温度スコア</strong>は、株温計が公開データから独自計算する 0〜100 のセンチメント指標です。
            日本版は C1（日経225 の 125 日移動平均との乖離率）、C2（裁定残バランス）、C3（投資主体別の海外勢フロー）、
            C4（信用倍率）、C5（USDJPY 50 日モメンタム）の 5 要素を等ウェイト平均して算出しており、
            米国版は VIX を主系列とした推定値で表示しています。
            <strong> 0 に近いほど「冷たい（悲観）」、100 に近いほど「熱い（楽観）」</strong>という設計です。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            計算ロジックの詳細はトップページのゲージ説明と{" "}
            <Link href="/about" className="underline hover:text-gray-900">
              「株温計とは」
            </Link>
            に、過去スコアの推移や類似日機能はトップ画面下部のセクションでそれぞれ確認できます。
          </p>
        </section>

        <section id="margin-ratio" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            信用倍率
          </h2>
          <p className="text-base leading-relaxed">
            信用倍率は<strong>「信用買い残 ÷ 信用売り残」</strong>で計算される需給指標で、JPX が毎週水曜日 15:00 に発表する週次データです。
            買い残は「信用取引で買いポジションを持ったまま決済していない株式の総額」、売り残はその逆。倍率が大きい（買い偏重）ほど、
            将来の売り戻し圧力が積み上がっており、上昇局面が長期化したサインと解釈されることが多い指標です。
            <strong>「4 倍を超えると過熱」「2 倍を割ると弱気」</strong>といった目安が伝統的に語られてきましたが、
            水準感は時代や個別銘柄構成によって変動します。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計では信用倍率を日本版温度スコアの C4 要素として組み込み、
            {" "}
            <Link href="/analysis/margin-ratio-temperature" className="underline hover:text-gray-900">
              「信用倍率 × 株温計」分析記事
            </Link>
            では水準別の翌 1ヶ月・3ヶ月・6ヶ月の日経225 リターンを集計しています。
            初心者向けの腰を据えた解説は{" "}
            <Link
              href="/learn/what-is-margin-ratio"
              className="underline hover:text-gray-900"
            >
              「信用倍率とは？」
            </Link>
            にまとめています。
          </p>
        </section>

        <section id="arbitrage-balance" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            裁定残（裁定買い残・裁定売り残）
          </h2>
          <p className="text-base leading-relaxed">
            裁定残は、現物株と先物の価格差を狙う<strong>裁定取引（アービトラージ）に伴って発生する未決済ポジションの残高</strong>のことです。
            JPX が毎営業日 16:00 に T+2 ベースで公表します。先物が現物より割高なときは「現物買い・先物売り」のポジションが膨らみ
            裁定買い残が増加、逆に先物が割安なときは裁定売り残が積み上がります。
            <strong>裁定買い残の急増は将来の現物売り（解消売り）要因</strong>として警戒され、SQ（先物・オプションの清算日）前後の需給を読む材料になります。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計の日本版スコアでは裁定残の推移を C2 要素として参照し、
            {" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップの日本市場データセクション
            </Link>
            で最新の残高と推移をご覧いただけます。
          </p>
        </section>

        <section id="investor-type-trading" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            投資主体別売買動向
          </h2>
          <p className="text-base leading-relaxed">
            投資主体別売買動向は、JPX が毎週木曜日 15:30 に発表する<strong>週次の株式売買動向データ</strong>です。
            外国人投資家・個人投資家・自己（証券会社の自己勘定）・投資信託・年金等といった主体別に、
            その週の現物・先物・オプションの売買金額（買越/売越）が公表されます。<strong>外国人売買動向は東証一部の週次フローの 6〜7 割を占める</strong>
            と言われ、市場の方向感を最も大きく左右する主体としてフォーカスされます。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計では外国人フローを日本版スコアの C3 要素に組み込んでおり、過去の暴落局面では
            {" "}
            <Link href="/events" className="underline hover:text-gray-900">
              主要イベント一覧
            </Link>
            の各ページでも当時のフロー水準を解説対象にしています。
          </p>
        </section>

        <section id="usdjpy-momentum" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            ドル円モメンタム
          </h2>
          <p className="text-base leading-relaxed">
            ドル円モメンタムは、USDJPY（ドル/円）の<strong>直近 50 営業日の変化率</strong>を中心に算出される指標で、
            日本株のセンチメントを左右する重要なマクロ要因として広く参照されます。日本企業の輸出比率の高さから、
            <strong>円安はおおむね日本株（特に大型輸出株）に追い風</strong>、円高は逆風になりやすい構造があるためです。
            ただしリスクオフ局面では「円高 + 株安」が同時に起きる（円キャリー巻き戻しなど）ため、単純な相関ではありません。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計の日本版スコアでは USDJPY 50 日モメンタムを C5 要素として採用しています。
            <strong>2024 年 8 月 5 日「令和のブラックマンデー」</strong>のように、円キャリー巻き戻しでドル円モメンタムが急変したケースは
            {" "}
            <Link href="/events/reiwa-black-monday-2024" className="underline hover:text-gray-900">
              主要イベントページ
            </Link>
            で詳細を扱っています。
          </p>
        </section>

        <section id="drawdown" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            ドローダウン（DD）と最大ドローダウン
          </h2>
          <p className="text-base leading-relaxed">
            ドローダウン（drawdown, DD）は、ある運用戦略やポートフォリオが<strong>過去の最高値からどれだけ下落しているか</strong>を示す指標です。
            <strong>最大ドローダウン（max DD）</strong>はその期間中で最も深かったドローダウンの値で、リスク管理の中核指標として使われます。
            たとえば「最大DD -30%」とは、ピーク時の評価額から谷底までの間に資産が 30% 目減りした、という意味です。
            年率リターンが同じでも、最大DD が浅いほうが投資家心理に優しく、暴落時の<strong>「狼狽売り」を回避しやすい</strong>とされます。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計では{" "}
            <Link href="/portfolio" className="underline hover:text-gray-900">
              温度連動バーチャルポートフォリオ
            </Link>
            の検証で、温度信号が「リターン向上」よりも「最大DD 抑制（日米とも約 -3pp）」に効いていたことを開示しています。
          </p>
        </section>

        <section id="dca" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            DCA（ドルコスト平均法）
          </h2>
          <p className="text-base leading-relaxed">
            DCA（Dollar Cost Averaging、ドルコスト平均法）は、<strong>一定金額を一定間隔で機械的に買い続ける投資手法</strong>です。
            買い付け単価が市場の上下に関わらず平均化されるため、高値掴みのリスクを抑え、初心者でも継続しやすい点が特徴です。
            一方で、長期的に右肩上がりの相場では<strong>一括投資（lump sum）に比べて期待リターンは劣後</strong>することが理論的にも実証的にも知られており、
            「リスク管理 vs リターン最大化」のトレードオフが基本となります。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            日本ではこの手法が新NISA のつみたて投資枠と組み合わせて広く実践されています。
            株温計の{" "}
            <Link href="/portfolio" className="underline hover:text-gray-900">
              バーチャルポートフォリオ検証
            </Link>
            では、月次積立 DCA をベンチマークの 1 つとして採用し、温度連動ルールとの差分を分解しています。
          </p>
        </section>

        <section id="nisa" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            新NISA（少額投資非課税制度）
          </h2>
          <p className="text-base leading-relaxed">
            新NISA は 2024 年 1 月から始まった日本の<strong>恒久・無期限の少額投資非課税制度</strong>です。
            年間投資枠は「つみたて投資枠 120 万円 + 成長投資枠 240 万円 = 計 360 万円」、生涯投資枠は<strong>1,800 万円</strong>（うち成長投資枠は 1,200 万円が上限）。
            運用益・配当が非課税になり、売却すれば翌年以降に枠が復活する点が旧 NISA との大きな違いです。
            つみたて投資枠は金融庁が選定した投信に限定され、長期・分散・低コスト運用を前提とした制度設計になっています。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            株温計では NISA つみたて投資家向けに、温度を「狼狽売りを防ぐ心理ブレーキ」として使う読み方を{" "}
            <Link href="/guide/nisa-tsumitate" className="underline hover:text-gray-900">
              NISA 積立投資家向けガイド
            </Link>
            にまとめています。
          </p>
        </section>

        <section id="similar-days" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            類似日（Similar Days）
          </h2>
          <p className="text-base leading-relaxed">
            <strong>類似日（Similar Days）</strong>は株温計独自の機能で、現在のスコアに最も近かった過去日を上位 5 件抽出し、
            その日以降の 1 / 3 / 6 ヶ月後リターンを並べて表示します。
            「今日と似たような温度だった過去はどんな相場展開だったか」という<strong>ナラティブの補助線</strong>として使う前提で、
            将来リターンを保証するものではありません。あくまで「同じ温度帯のとき、過去の中央値・分布はどうだったか」を眺める参考用です。
          </p>
          <p className="text-base leading-relaxed mt-2 text-gray-600">
            類似日に主要イベント（コロナショック・令和のブラックマンデー等）が含まれる場合は、
            {" "}
            <Link href="/events" className="underline hover:text-gray-900">
              イベント詳細ページ
            </Link>
            への直接リンクを表示し、当時の背景・温度・その後のリターンを掘り下げて読めるようにしています。
          </p>
        </section>

        <section className="mt-10 pt-6 border-t border-gray-200 text-sm text-gray-600">
          <p>
            記事の中で取り上げてほしい用語のリクエストは{" "}
            <a
              href="mailto:info@kabuonkei.com"
              className="underline hover:text-gray-900"
            >
              info@kabuonkei.com
            </a>
            {" "}までお寄せください。実際の指標を扱った検証記事は{" "}
            <Link href="/analysis" className="underline hover:text-gray-900">
              分析記事インデックス
            </Link>
            から辿れます。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
