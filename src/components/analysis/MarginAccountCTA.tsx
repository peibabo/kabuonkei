"use client";

import { trackEvent } from "@/lib/analytics";

interface BrokerItem {
  id: "matsui" | "gmo" | "sbi";
  name: string;
  tagline: string;
  strength: string;
  // TODO: ASP (A8 / もしも / バリューコマース など) 登録後に実 URL を差し替える。
  // 差し替え時は id をキーにして1箇所で置換可能。
  placeholderHref: string;
}

const BROKERS: BrokerItem[] = [
  {
    id: "matsui",
    name: "松井証券",
    tagline: "低金利信用取引・一日信用",
    strength: "信用取引の金利（買方金利）業界最低水準クラス。デイトレ向けの「一日信用」は金利0%",
    placeholderHref: "#", // TODO: ASP 登録後に差し替え
  },
  {
    id: "gmo",
    name: "GMOクリック証券",
    tagline: "信用取引・CFDが強い",
    strength: "信用取引手数料無料（条件付き）。プロ向けツールも無料で使える",
    placeholderHref: "#", // TODO: ASP 登録後に差し替え
  },
  {
    id: "sbi",
    name: "SBI証券",
    tagline: "大手・総合力",
    strength: "銘柄数・IPO 取扱・NISA 連携で国内 No.1。メイン口座との併用もしやすい",
    placeholderHref: "#", // TODO: ASP 登録後に差し替え
  },
];

interface Props {
  placement: "bottom_cta" | "boost_banner";
}

export default function MarginAccountCTA({ placement }: Props) {
  function handleClick(brokerId: BrokerItem["id"]) {
    trackEvent("affiliate_click", {
      article: "margin-ratio-temperature",
      broker: brokerId,
      placement,
    });
  }

  return (
    <aside
      aria-labelledby="margin-cta-heading"
      className="bg-amber-50 border border-amber-200 rounded-xl p-5 my-8"
    >
      <p className="text-[11px] text-amber-900/70 mb-2">
        ※本カード内のリンクには広告（アフィリエイト）が含まれます（PR）
      </p>
      <h3 id="margin-cta-heading" className="text-base font-bold text-gray-900 mb-1">
        信用取引口座を比較する
      </h3>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        信用倍率を踏まえた売買を検討している方へ。信用取引はメイン口座とは別のサブ口座で開設する人が多く、金利・手数料・ツールで差がつきます。
      </p>
      <ul className="space-y-3 list-none pl-0">
        {BROKERS.map((b) => (
          <li key={b.id}>
            <a
              href={b.placeholderHref}
              rel="sponsored nofollow noopener noreferrer"
              target="_blank"
              data-affiliate-placeholder={b.id}
              onClick={() => handleClick(b.id)}
              className="block bg-white rounded-lg px-4 py-3 border border-amber-200 hover:border-amber-400 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900">{b.name}</div>
                  <div className="text-xs text-amber-900/80">{b.tagline}</div>
                </div>
                <span className="text-xs text-amber-700 shrink-0">公式 →</span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{b.strength}</p>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
        ※ 信用取引は担保となる現金または有価証券を預けたうえで、証券会社から資金や株式を借りて売買する取引です。元本を超える損失が発生する可能性があるため、仕組みとリスクを十分にご確認のうえご利用ください。
      </p>
    </aside>
  );
}
