/** 市場イベント（暴落・政策転換等）の辞書エントリ。`/events/[slug]` 詳細ページで使用。 */
export interface EventMeta {
  slug: string; // URL安定用。"[event-name-kebab]-[YYYY]" 形式
  date: string; // "YYYY-MM-DD"
  label: string; // 短いラベル（類似日カードで従来表示されていた文言）
  oneLiner: string; // 1行の状況説明（カードヘッダ・OG画像向け）
}

/** イベントごとに事前計算した将来リターン（日米指数の%表示） */
export interface EnrichedReturns {
  return1m: number | null;
  return3m: number | null;
  return6m: number | null;
  return1y: number | null;
}

export interface EventEnrichedEntry {
  slug: string;
  date: string;
  jp: EnrichedReturns; // 日経225ベース
  us: EnrichedReturns; // S&P500ベース
}

export interface EventEnrichedFile {
  generatedAt: string;
  entries: EventEnrichedEntry[];
}
