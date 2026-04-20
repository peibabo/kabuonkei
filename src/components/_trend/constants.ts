/** 温度推移チャートの共通定数（米国版 / 日本版で共用） */

/** Recharts の ReferenceArea で描画する温度帯バンドの定義 */
export const TEMPERATURE_BANDS = [
  { y1: 0, y2: 20, color: "#2563eb" }, // 極寒
  { y1: 20, y2: 40, color: "#0ea5e9" }, // 冷え込み
  { y1: 40, y2: 60, color: "#ca8a04" }, // 平温
  { y1: 60, y2: 80, color: "#ea580c" }, // 過熱
  { y1: 80, y2: 100, color: "#dc2626" }, // 沸騰
] as const;

/** チャート下部の凡例に表示する温度帯ラベル */
export const TEMPERATURE_LEGEND_ITEMS = [
  { label: "極寒", color: "#2563eb" },
  { label: "冷え込み", color: "#0ea5e9" },
  { label: "平温", color: "#ca8a04" },
  { label: "過熱", color: "#ea580c" },
  { label: "沸騰", color: "#dc2626" },
] as const;
