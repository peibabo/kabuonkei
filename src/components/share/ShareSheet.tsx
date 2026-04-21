"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { buildEmbedSnippet } from "@/app/widget/_lib/embed-snippet";
import { buildShareText } from "@/lib/share-text";
import { trackEvent } from "@/lib/analytics";

export interface ShareSheetProps {
  market: "jp" | "us";
  japanScore: number | null;
  usScore: number | null;
  japanLevel: string | null;
  usLevel: string | null;
  dateLabel: string;
  siteUrl: string;
  onClose: () => void;
}

/**
 * PC ではモーダル、モバイルではボトムドロワーとして振る舞う単一コンポーネント。
 * `md:` ブレークポイントで位置と角丸のみ切り替え、中身は共通。
 */
export default function ShareSheet(props: ShareSheetProps) {
  const [show, setShow] = useState(false);
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copyStatus, setCopyStatus] = useState<
    null | "url" | "embed" | "image"
  >(null);

  const shareText = buildShareText(props);
  const embedHtml = buildEmbedSnippet(props.siteUrl);
  const shareUrl = `${props.siteUrl.replace(/\/+$/, "")}/?ref=share&utm_source=x&utm_campaign=share_card`;

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function requestClose() {
    setShow(false);
    window.setTimeout(props.onClose, 200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],textarea,input,[tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCopy(
    text: string,
    key: "url" | "embed",
    method: string,
  ) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(key);
      trackEvent("share", { method, market: props.market });
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      // noop
    }
  }

  function handleTwitter() {
    trackEvent("share", { method: "twitter", market: props.market });
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  async function handleImageDownload() {
    trackEvent("share", {
      method: "image_download",
      market: props.market,
    });
    try {
      const res = await fetch("/widget/today");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "kabuonkei-today.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setCopyStatus("image");
      window.setTimeout(() => setCopyStatus(null), 2000);
    } catch {
      // noop（ネットワーク失敗など）
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-200 ${
        show ? "opacity-100" : "opacity-0"
      }`}
      aria-hidden={!show}
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={requestClose}
        aria-hidden="true"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
          absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-xl
          max-h-[90vh] overflow-y-auto
          transition-transform duration-300 ease-out
          md:left-1/2 md:right-auto md:top-1/2 md:bottom-auto
          md:-translate-x-1/2 md:-translate-y-1/2
          md:w-[480px] md:max-w-[calc(100vw-2rem)]
          md:rounded-2xl
          ${
            show
              ? "translate-y-0 md:opacity-100 md:scale-100"
              : "translate-y-full md:translate-y-[-50%] md:opacity-0 md:scale-95"
          }
        `}
      >
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden="true" />
        </div>

        <div className="flex items-center justify-between px-5 pt-4 md:pt-5">
          <h2
            id={titleId}
            className="text-lg font-bold text-gray-900"
          >
            この温度を共有
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="閉じる"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path
                d="M5 5L15 15M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5">
          <div className="mt-3 flex justify-center bg-gray-50 rounded-lg p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/widget/today"
              width={400}
              height={400}
              alt="株温計 - 今日の市場温度"
              className="rounded-md shadow-sm w-full max-w-[260px] aspect-square"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <ShareActionButton
              icon="🐦"
              label="Xで共有"
              onClick={handleTwitter}
            />
            <ShareActionButton
              icon="🖼"
              label={copyStatus === "image" ? "保存しました" : "画像を保存"}
              onClick={handleImageDownload}
            />
            <ShareActionButton
              icon="🔗"
              label={copyStatus === "url" ? "コピーしました" : "URLをコピー"}
              onClick={() => handleCopy(shareUrl, "url", "url_copy")}
            />
            <ShareActionButton
              icon="📝"
              label={
                copyStatus === "embed"
                  ? "コピーしました"
                  : "ブログに貼る"
              }
              onClick={() =>
                handleCopy(embedHtml, "embed", "embed_copy")
              }
            />
          </div>

          <details className="mt-4 group">
            <summary className="text-xs text-gray-500 hover:text-gray-700 select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">
                ▶
              </span>
              <span>埋め込みコード（HTML）を見る</span>
            </summary>
            <pre className="mt-2 bg-gray-900 text-gray-100 text-[10px] rounded-lg p-3 overflow-x-auto leading-relaxed">
              <code>{embedHtml}</code>
            </pre>
          </details>

          <div className="mt-4 text-center">
            <Link
              href="/widget"
              className="text-xs text-gray-500 hover:text-gray-800 underline"
              onClick={requestClose}
            >
              埋め込みの詳しい使い方 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 px-3 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-sm font-medium text-gray-800 transition-colors"
    >
      <span className="text-base" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
