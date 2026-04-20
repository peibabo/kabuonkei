/** 温度推移チャートで共通するRecharts軸設定（米国版/日本版で共用） */

const COMMON_TICK = { fontSize: 11, fill: "#9ca3af" } as const;

export const TREND_Y_AXIS_PROPS = {
  domain: [0, 100],
  ticks: [0, 20, 40, 60, 80, 100],
  tick: COMMON_TICK,
  axisLine: false,
  tickLine: false,
} as const;

export const TREND_X_AXIS_BASE_PROPS = {
  dataKey: "date",
  tick: COMMON_TICK,
  axisLine: false,
  tickLine: false,
} as const;
