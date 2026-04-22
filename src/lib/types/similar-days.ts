/** 過去の類似日検索用の1エントリ。日付・温度スコア・将来リターン */
export interface SimilarDayEntry {
  date: string; // "YYYY-MM-DD"
  score: number;
  return1m: number | null; // %、+は上昇・-は下落
  return3m: number | null;
  return6m: number | null;
}

/** 類似日検索結果（スコア差・イベントラベル・イベントスラッグを付加） */
export interface SimilarDayMatch extends SimilarDayEntry {
  scoreDiff: number;
  eventLabel?: string;
  /** event label が付いた日のイベント詳細ページ (`/events/[slug]`) への slug */
  eventSlug?: string;
}

/** 類似日データファイルの構造 */
export interface SimilarDaysFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  market: "japan" | "us";
  note: string;
  daily: SimilarDayEntry[];
}
