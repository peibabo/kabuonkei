import { ReferenceArea } from "recharts";
import { TEMPERATURE_BANDS } from "./constants";

/**
 * 温度帯バンドを ReferenceArea の配列として返す。
 * Recharts の chart 子要素として `{renderTemperatureBands()}` の形で差し込む。
 */
export function renderTemperatureBands() {
  return TEMPERATURE_BANDS.map((band) => (
    <ReferenceArea
      key={band.y1}
      y1={band.y1}
      y2={band.y2}
      fill={band.color}
      fillOpacity={0.06}
      ifOverflow="extendDomain"
    />
  ));
}
