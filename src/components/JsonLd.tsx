/**
 * JSON-LD をサーバー HTML に直接埋め込む（buildXxxJsonLd が返す JSON 文字列を渡す）。
 * next/script の afterInteractive と違い、JS を実行しないクローラーにも見える。
 */
export default function JsonLd({ json }: { json: string }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
