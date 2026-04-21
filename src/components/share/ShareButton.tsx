"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trackEvent } from "@/lib/analytics";
import { formatJstDateLabel } from "@/lib/jst-date";
import ShareSheet from "./ShareSheet";

export interface ShareButtonProps {
  market: "jp" | "us";
  japanScore: number | null;
  usScore: number | null;
  japanLevel: string | null;
  usLevel: string | null;
}

/**
 * FearGreedGauge の右上に出す 📤 共有トリガー。
 * クリックで ShareSheet を body 直下に Portal として描画する。
 */
export default function ShareButton(props: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleOpen() {
    trackEvent("share_sheet_open", { market: props.market });
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label={`${
          props.market === "jp" ? "日本" : "米国"
        }の温度を共有`}
        className="absolute top-0 right-0 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      {mounted && isOpen
        ? createPortal(
            <ShareSheet
              market={props.market}
              japanScore={props.japanScore}
              usScore={props.usScore}
              japanLevel={props.japanLevel}
              usLevel={props.usLevel}
              dateLabel={formatJstDateLabel()}
              siteUrl={siteUrl}
              onClose={handleClose}
            />,
            document.body,
          )
        : null}
    </>
  );
}
