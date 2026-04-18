import { ImageResponse } from "next/og";

export const alt = "株温計 - 今日の相場、熱い？冷たい？";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const THERMOMETER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<path d="M16 2 C14 2 12.5 3.5 12.5 5.5 V18 C10.3 19.3 9 21.7 9 24.3 C9 28.2 12.1 31.3 16 31.3 C19.9 31.3 23 28.2 23 24.3 C23 21.7 21.7 19.3 19.5 18 V5.5 C19.5 3.5 18 2 16 2 Z" fill="#1f2937"/>
<path d="M16 3.8 C14.7 3.8 13.8 4.7 13.8 6 V18.8 C11.9 19.8 10.6 21.8 10.6 24.3 C10.6 27.3 13 29.7 16 29.7 C19 29.7 21.4 27.3 21.4 24.3 C21.4 21.8 20.1 19.8 18.2 18.8 V6 C18.2 4.7 17.3 3.8 16 3.8 Z" fill="#ffffff"/>
<circle cx="16" cy="24.3" r="3.8" fill="#ef4444"/>
<rect x="14.7" y="12" width="2.6" height="12.5" fill="#ef4444"/>
</svg>`;

async function loadGoogleFont(
  family: string,
  text: string,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(url);
  if (!cssRes.ok) throw new Error(`Font CSS fetch failed: ${cssRes.status}`);
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\(([^)]+)\)\s*format/);
  if (!match) throw new Error("Font URL not found in CSS");
  const fontRes = await fetch(match[1]);
  if (!fontRes.ok) throw new Error(`Font fetch failed: ${fontRes.status}`);
  return fontRes.arrayBuffer();
}

export default async function Image() {
  const charSet = "株温計今日の相場熱い冷たい日本米国市場の温度をひと目で";
  let boldFont: ArrayBuffer | null = null;
  let mediumFont: ArrayBuffer | null = null;
  try {
    [boldFont, mediumFont] = await Promise.all([
      loadGoogleFont("Noto+Sans+JP:wght@900", charSet),
      loadGoogleFont("Noto+Sans+JP:wght@500", charSet),
    ]);
  } catch {
    // フォント取得失敗時はシステムフォントへフォールバック
  }

  const fonts: {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 500 | 900;
  }[] = [];
  if (boldFont) {
    fonts.push({
      name: "NotoSansJP",
      data: boldFont,
      style: "normal",
      weight: 900,
    });
  }
  if (mediumFont) {
    fonts.push({
      name: "NotoSansJP",
      data: mediumFont,
      style: "normal",
      weight: 500,
    });
  }

  const svgDataUri = `data:image/svg+xml;base64,${Buffer.from(THERMOMETER_SVG).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #fff7ed 0%, #fed7aa 45%, #fca5a5 100%)",
          fontFamily: "NotoSansJP, sans-serif",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={svgDataUri}
          width={160}
          height={160}
          alt="thermometer"
          style={{ marginBottom: 12 }}
        />
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            color: "#111827",
            letterSpacing: -4,
            lineHeight: 1.1,
            paddingBottom: 12,
          }}
        >
          株温計
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 500,
            color: "#1f2937",
            marginTop: 24,
          }}
        >
          今日の相場、熱い？冷たい？
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "#4b5563",
            marginTop: 20,
            opacity: 0.85,
          }}
        >
          日本 × 米国 市場の温度をひと目で
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
