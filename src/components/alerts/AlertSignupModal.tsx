"use client";

import { useEffect, useId, useRef, useState } from "react";
import AlertSignupForm from "./AlertSignupForm";
import type { AlertVariant } from "@/lib/types";

interface Props {
  defaultVariants: AlertVariant[];
  onClose: () => void;
}

export default function AlertSignupModal({ defaultVariants, onClose }: Props) {
  const [show, setShow] = useState(false);
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function requestClose() {
    setShow(false);
    window.setTimeout(onClose, 200);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),[tabindex]:not([tabindex="-1"])',
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
          <h2 id={titleId} className="text-lg font-bold text-gray-900">
            🔔 温度アラートに登録
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
          <AlertSignupForm
            defaultVariants={defaultVariants}
            autoFocus
            source="modal"
            successAction={
              <button
                type="button"
                onClick={requestClose}
                className="mt-4 w-full py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-black transition-colors"
              >
                閉じる
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
