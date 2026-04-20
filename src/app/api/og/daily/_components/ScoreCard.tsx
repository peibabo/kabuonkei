/** OG 画像内で 1 市場分の温度を表示するカード（ImageResponse 用 JSX） */
export default function ScoreCard({
  flag,
  country,
  score,
  level,
  desc,
  color,
}: {
  flag: string;
  country: string;
  score: number | null;
  level: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      style={{
        width: 520,
        height: 300,
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderRadius: 24,
        padding: 24,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        borderTop: `8px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: 56,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 48, marginRight: 12 }}>{flag}</div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: "#1f2937",
          }}
        >
          {country}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 112,
          fontWeight: 900,
          color,
          height: 120,
          marginTop: 8,
          flexShrink: 0,
          letterSpacing: -4,
          alignItems: "flex-start",
        }}
      >
        {String(score ?? "—")}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 40,
          fontWeight: 900,
          color: "#111827",
          height: 44,
          flexShrink: 0,
        }}
      >
        {level}
      </div>
      {desc ? (
        <div
          style={{
            display: "flex",
            fontSize: 22,
            fontWeight: 500,
            color: "#4b5563",
            height: 28,
            marginTop: 2,
            flexShrink: 0,
          }}
        >
          {`(${desc})`}
        </div>
      ) : null}
    </div>
  );
}
