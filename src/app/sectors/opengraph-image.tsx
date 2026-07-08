import { ImageResponse } from "next/og";
import { buildNotoSansJpFonts } from "@/lib/og/fonts";
import { THERMOMETER_SVG } from "@/lib/og/thermometer-svg";
import {
  getJapanSectorHeatmap,
  getTopSectorsForScore,
} from "@/lib/japan-sector-heatmap";

export const alt = "温度帯別 業種（セクター）ヒートマップ — 株温計";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default async function Image() {
  const heatmap = getJapanSectorHeatmap();
  // 対照的な2帯（極寒 / 沸騰）の 3ヶ月後 TOP3 を対比して見せる
  const coldTop = getTopSectorsForScore(10, "3m", 3);
  const hotTop = getTopSectorsForScore(90, "3m", 3);

  const sectorNames = heatmap.sectors.map((s) => s.name).join("");
  const charSet =
    "温度帯別業種セクターヒートマップ株温計極寒沸騰のときに強かった業種で強さが変わる平均リターン・勝率（ヶ月後 TOP 対比）×〜kabuonkei.com/sectors0123456789+-.%" +
    sectorNames;
  const fonts = await buildNotoSansJpFonts(charSet);

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(
    THERMOMETER_SVG,
  ).toString("base64")}`;

  const panel = (
    title: string,
    titleColor: string,
    rankings: ReturnType<typeof getTopSectorsForScore>,
  ) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "white",
        padding: 24,
        borderRadius: 20,
        border: "1px solid #bfdbfe",
      }}
    >
      <span style={{ fontSize: 22, fontWeight: 700, color: titleColor }}>
        {title}
      </span>
      {rankings.map((r, i) => (
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
          <span
            style={{
              fontWeight: 900,
              color: r.stats.avgReturn >= 0 ? "#dc2626" : "#16a34a",
            }}
          >
            {formatPct(r.stats.avgReturn)}
          </span>
        </div>
      ))}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
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
              color: "#1e3a8a",
              letterSpacing: -1,
            }}
          >
            株温計
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: "#1e40af",
              marginLeft: 8,
              marginTop: 10,
            }}
          >
            温度帯別 業種ヒートマップ
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
              fontSize: 46,
              fontWeight: 900,
              color: "#1e3a8a",
              lineHeight: 1.15,
              marginBottom: 12,
            }}
          >
            温度帯 × 業種で強さが変わる
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 500,
              color: "#475569",
              lineHeight: 1.4,
              marginBottom: 28,
            }}
          >
            17業種 × 5温度帯の平均リターン・勝率（3ヶ月後 TOP3 対比）
          </div>

          <div style={{ display: "flex", gap: 24 }}>
            {panel("❄️ 極寒のとき強かった業種", "#2563eb", coldTop)}
            {panel("🔥 沸騰のとき強かった業種", "#dc2626", hotTop)}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#1e40af",
            borderTop: "1px solid #bfdbfe",
            paddingTop: 12,
          }}
        >
          <span>kabuonkei.com/sectors</span>
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
