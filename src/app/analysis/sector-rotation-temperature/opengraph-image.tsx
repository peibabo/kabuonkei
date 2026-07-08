import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import {
  getSectorRankingForLevel,
  computeGroupAverage,
  DEFENSIVE_SECTOR_CODES,
} from "@/lib/sector-rotation";
import { getJapanSectorHeatmap } from "@/lib/japan-sector-heatmap";

export const alt =
  "暴落時に強い業種はどれ？— 温度帯×17業種の過去10年検証 — 株温計";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function Image() {
  const heatmap = getJapanSectorHeatmap();
  const coldTop3 = getSectorRankingForLevel("極寒", "3m").slice(0, 3);
  const defensive = getJapanSectorHeatmap().sectors.filter((s) =>
    DEFENSIVE_SECTOR_CODES.includes(s.code)
  );
  const defAvg = computeGroupAverage(DEFENSIVE_SECTOR_CODES, "極寒", "3m");

  const sectorNames =
    coldTop3.map((r) => r.sector.name).join("") +
    defensive.map((s) => s.name).join("");
  const charSet =
    "暴落時に強い業種はどれ？温度帯×の過去年検証株温計極寒後ヶ月リターン守りディフェンシブ平均意外な結果じつは景気敏感が戻る373ヶ月0123456789+-.%〜kabuonkei.com/analysis" +
    sectorNames;
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG,
  ).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={svgDataUri} width={56} height={56} alt="thermometer" />
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: "#78350f",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#92400e",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            分析記事
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 48,
              fontWeight: 900,
              color: "#78350f",
              lineHeight: 1.2,
              marginBottom: 12,
            }}
          >
            暴落時に強い業種はどれ？
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              color: "#92400e",
              lineHeight: 1.4,
              marginBottom: 28,
            }}
          >
            温度帯×17業種の過去10年検証 — じつは景気敏感が戻る
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            <div
              style={{
                flex: 1.4,
                display: "flex",
                flexDirection: "column",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #fcd34d",
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: "#2563eb" }}>
                ❄️ 極寒後3ヶ月 リターンTOP3
              </span>
              {coldTop3.map((r, i) => (
                <div
                  key={r.sector.code}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 26,
                    marginTop: 12,
                  }}
                >
                  <span style={{ color: "#334155", fontWeight: 700 }}>
                    {i + 1}. {r.sector.name}
                  </span>
                  <span style={{ fontWeight: 900, color: "#dc2626" }}>
                    {formatPct(r.stats.avgReturn)}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                background: "white",
                padding: 24,
                borderRadius: 20,
                border: "1px solid #fcd34d",
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 700, color: "#475569" }}>
                🛡 「守り」のディフェンシブ
              </span>
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 900,
                  color: "#94a3b8",
                  marginTop: 12,
                }}
              >
                平均 {formatPct(defAvg)}
              </span>
              <span style={{ fontSize: 18, color: "#94a3b8", marginTop: 6 }}>
                {defensive.map((s) => s.name).join("・")}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#92400e",
            borderTop: "1px solid #fcd34d",
            paddingTop: 12,
          }}
        >
          <span>kabuonkei.com/analysis</span>
          <span>
            {heatmap.dataRange.from} 〜 {heatmap.dataRange.to}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
