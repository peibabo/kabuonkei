import type { Metadata } from "next";

/**
 * /stock・/stock/[code]・/ranking 共通のメタ情報。
 * 銘柄ごとの OG 画像は作らず、サイト共通の画像を使う。
 */
export function buildStockPageMetadata(input: {
  path: string;
  /** <title> にそのまま入れる文字列（"| 株温計" のテンプレートは付けない） */
  title: string;
  description: string;
}): Metadata {
  const { path, title, description } = input;
  const images = ["/opengraph-image"];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: { title, description, type: "website", url: path, locale: "ja_JP", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
