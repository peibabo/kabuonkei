import { formatJaDateTimeJst } from "@/lib/stock-temperature/format";

/** 銘柄別温度ページ共通の更新日時・免責表示 */
export default function StockDisclaimer({ generatedAt }: { generatedAt: string }) {
  return (
    <aside className="not-prose border-t border-gray-200 pt-4 text-xs text-gray-500 space-y-1">
      <p>データ更新: {formatJaDateTimeJst(generatedAt)}（JST、毎営業日の取引終了後に更新）</p>
      <p>
        株価の温度は公開されている株価データから株温計が独自に計算した指標で、商用データ配信サービスではありません。株価そのものは掲載していません。
      </p>
      <p>
        本ページは情報提供を目的としたもので、特定銘柄の売買を勧めるものではありません（投資助言ではありません）。投資判断はご自身の責任で行ってください。
      </p>
    </aside>
  );
}
