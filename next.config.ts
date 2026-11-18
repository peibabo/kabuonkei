import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // scripts/download-fonts.ts が置く <内容のハッシュ 16 桁>.woff2 だけを長期キャッシュする
        // （ファイル名が変わらないまま中身が変わることがない）
        source: "/fonts/:family/:file([0-9a-f]{16}\\.woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
