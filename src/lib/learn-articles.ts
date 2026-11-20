/**
 * 解説記事（/learn/[slug]）の一覧。/learn の一覧ページ・sitemap・銘柄別ページの関連記事で共有する。
 * publishedAt / modifiedAt は各記事ページの PUBLISHED_AT / MODIFIED_AT と揃える（テストで照合）。
 */
export interface LearnArticle {
  slug: string;
  icon: string;
  title: string;
  /** 関連記事欄などで使う短いタイトル */
  shortTitle: string;
  description: string;
  publishedAt: string;
  modifiedAt: string;
}

export const LEARN_ARTICLES: LearnArticle[] = [
  {
    slug: "when-to-buy-stocks",
    icon: "🧭",
    title:
      "株の買い時はいつ？過熱感・底値の見極め方を指標から整理（まとめ）",
    shortTitle: "株の買い時はいつ？過熱感・底値の見極め方",
    description:
      "「株の買い時」を 1 指標で当てる方法はありません。センチメント・需給・リスク・マクロ（為替）の 4 カテゴリで過熱感と底値圏を見極める考え方を、各指標の解説記事と市場温度スコアへの導線つきで整理したまとめ記事。",
    publishedAt: "2026-06-18",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-usdjpy-momentum",
    icon: "💴",
    title:
      "円安・円高と株価の関係とは？リスクオフで円高になる仕組みを初心者向けに解説",
    shortTitle: "円安・円高と株価の関係とは？",
    description:
      "なぜ円安は日本株に追い風で円高は逆風なのか、リスクオフで「円高＋株安」が同時に起きる仕組み（円キャリー巻き戻し）、単純な逆相関では読めない注意点、「ドル円モメンタム」という指標と株温計が温度スコアから外した理由を初心者向けに整理。",
    publishedAt: "2026-06-18",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-nikkei-vi",
    icon: "🌡️",
    title:
      "日経VIとは？VIX との違いと日本市場の不安心理の測り方を初心者向けに解説",
    shortTitle: "日経VIとは？VIX との違い",
    description:
      "日経VI（日経平均ボラティリティー・インデックス）の意味、VIX との違い（対象指数・算出元）、平時20前後／30超で警戒／40超でパニックという水準別の目安、^JNV のデータ取得制約、株温計が VIX 系を主系列にしている理由を初心者向けに整理。",
    publishedAt: "2026-06-18",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-advance-decline-ratio",
    icon: "📈",
    title:
      "騰落レシオとは？水準別の意味と過熱・底値圏の見方を初心者向けに解説",
    shortTitle: "騰落レシオとは？過熱・底値圏の見方",
    description:
      "騰落レシオ（値上がり銘柄数÷値下がり銘柄数）の意味、25 日移動平均の計算方法、「120 超え＝過熱／70 割れ＝底値圏」という水準別の目安、だましシグナルへの注意、株温計の市場温度スコアとの関係を初心者向けに整理。",
    publishedAt: "2026-06-18",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-drawdown",
    icon: "📉",
    title:
      "ドローダウンとは？最大DDの意味と「リターンより怖い」理由を初心者向けに解説",
    shortTitle: "ドローダウン（最大DD）とは？",
    description:
      "ドローダウン (DD) と最大ドローダウンの意味、計算式、過去の S&P500・日経225 のDD実績、なぜリターンより最大DDが投資判断で重要かを解説。株温計の温度連動ポートフォリオによる「温度信号は最大DDを浅くしたのか」の正直な検証への接続も整理。",
    publishedAt: "2026-05-08",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-arbitrage-balance",
    icon: "⚖️",
    title:
      "裁定残とは？裁定買い残・売り残の意味と SQ 前後で気にすべき理由",
    shortTitle: "裁定残とは？SQ 前後で気にすべき理由",
    description:
      "裁定残（裁定取引残高）の見方を初心者向けに解説。裁定買い残と裁定売り残の違い、JPX 毎営業日 16:00 公表データの読み方、メジャー SQ 前後で起きる「裁定解消売り／買い戻し」、株温計が温度スコアから外した理由まで整理。",
    publishedAt: "2026-05-08",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-investor-flow",
    icon: "🌐",
    title:
      "投資部門別売買動向とは？外国人投資家のフローを毎週どう読むか",
    shortTitle: "投資部門別売買動向（外国人フロー）の読み方",
    description:
      "投資部門別売買状況（JPX 公表）の見方を初心者向けに解説。主要 6 区分の主体・外国人フローが日本市場の主役と言われる根拠（2024 年シェア値）・読み方のコツ 4 つ・株温計の「需給の温度」での扱いまで整理。2016 年からの週次データで、外国人の売買と株価の向きの一致率や大きく売り越した後の日経225 も検証。",
    publishedAt: "2026-05-08",
    modifiedAt: "2026-11-20",
  },
  {
    slug: "what-is-margin-ratio",
    icon: "📊",
    title:
      "信用倍率とは？見方・水準別の意味と、温度スコアと組み合わせて読むコツ",
    shortTitle: "信用倍率とは？水準別の意味と見方",
    description:
      "信用倍率（信用買い残÷信用売り残）の意味、JPX 公表データの読み方、「4 倍超え=過熱」という通説の真偽、株温計の温度スコアと組み合わせた使いどころを初心者向けに解説。",
    publishedAt: "2026-04-28",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-fear-greed",
    icon: "🌡️",
    title:
      "Fear & Greed Index とは？CNN 米国版の中身と、日本版を株温計でどう作っているか",
    shortTitle: "Fear & Greed Index とは？日本版の作り方",
    description:
      "CNN Fear & Greed Index の構成 7 要素・スコアの読み方・実用上の使いどころを解説。日本版を作るとしたら何が違うのかも、株温計の市場温度と対比しながら整理します。",
    publishedAt: "2026-04-28",
    modifiedAt: "2026-11-19",
  },
  {
    slug: "what-is-vix",
    icon: "📉",
    title:
      "VIX（恐怖指数）とは？S&P500 の不安心理を測る指標を初心者向けに解説",
    shortTitle: "VIX（恐怖指数）とは？",
    description:
      "VIX の定義、算出ロジック、水準別の意味、過去 20 年データで見た「VIX 30 超え＝危険」の真偽、日本投資家にとっての見方までを腰を据えて解説。",
    publishedAt: "2026-04-28",
    modifiedAt: "2026-04-28",
  },
];

/** 一覧ページ・sitemap 用: 解説記事のうち最も新しい更新日 */
export function latestLearnModifiedAt(): string {
  return LEARN_ARTICLES.reduce(
    (max, a) => (a.modifiedAt > max ? a.modifiedAt : max),
    LEARN_ARTICLES[0].modifiedAt
  );
}
