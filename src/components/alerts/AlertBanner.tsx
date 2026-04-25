"use client";

import { useEffect, useMemo, useState } from "react";
import AlertSignupModal from "./AlertSignupModal";
import { trackEvent } from "@/lib/analytics";
import { subscribeOpenAlertModal } from "@/lib/alert-modal-bus";
import type { AlertVariant } from "@/lib/types";

interface Props {
  japanScore: number | null;
  usScore: number | null;
}

function isCold(score: number | null): boolean {
  return score != null && score <= 20;
}
function isHot(score: number | null): boolean {
  return score != null && score >= 80;
}

export default function AlertBanner({ japanScore, usScore }: Props) {
  const [open, setOpen] = useState(false);

  const { isExtreme, extremeLabel, defaultVariants } = useMemo(() => {
    const variants: AlertVariant[] = [];
    const labels: string[] = [];
    if (isCold(usScore)) {
      variants.push("us_cold");
      labels.push(`米国 極寒 (${usScore})`);
    }
    if (isHot(usScore)) {
      variants.push("us_hot");
      labels.push(`米国 過熱 (${usScore})`);
    }
    if (isCold(japanScore)) {
      variants.push("jp_cold");
      labels.push(`日本 極寒 (${japanScore})`);
    }
    if (isHot(japanScore)) {
      variants.push("jp_hot");
      labels.push(`日本 過熱 (${japanScore})`);
    }
    const extreme = variants.length > 0;
    return {
      isExtreme: extreme,
      extremeLabel: labels.join(" / "),
      // 平温時は全 variants を初期選択、極端時はその variants のみ
      defaultVariants: extreme
        ? variants
        : (["jp_cold", "jp_hot", "us_cold", "us_hot"] as AlertVariant[]),
    };
  }, [japanScore, usScore]);

  function handleOpen(source: string = "banner") {
    trackEvent("alerts_modal_opened", {
      source,
      extreme: isExtreme ? "true" : "false",
    });
    setOpen(true);
  }

  // Hero / Header の「アラート登録」 CTA から bus 経由で開かれるイベントを購読
  useEffect(() => {
    return subscribeOpenAlertModal(({ source }) => {
      handleOpen(source);
    });
    // handleOpen は isExtreme をクロージャで参照するため依存に入れる
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExtreme]);

  const containerClass = isExtreme
    ? "bg-red-50 border-red-300"
    : "bg-gray-50 border-gray-200";
  const badgeClass = isExtreme
    ? "bg-red-600 text-white"
    : "bg-gray-900 text-white";

  return (
    <>
      <div
        className={`mt-4 mb-2 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 ${containerClass}`}
      >
        <div className="flex-1 min-w-0">
          {isExtreme ? (
            <>
              <p className="text-sm font-bold text-red-900">
                ⚠️ 今、温度が極端です: {extremeLabel}
              </p>
              <p className="text-xs text-red-800 mt-0.5">
                次にこの状態が来たとき、メールでお知らせします。
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900">
                🔔 極端温度（≤20 or ≥80）になったらメールでお知らせ
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                連続発火なし・いつでもワンクリック解除。
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleOpen("banner")}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors hover:opacity-90 ${badgeClass}`}
        >
          {isExtreme ? "このタイミングで登録" : "アラート登録"}
        </button>
      </div>

      {open ? (
        <AlertSignupModal
          defaultVariants={defaultVariants}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
