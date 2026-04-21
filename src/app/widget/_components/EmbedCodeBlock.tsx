"use client";

import { useState } from "react";

interface Props {
  code: string;
}

export default function EmbedCodeBlock({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative">
      <pre className="bg-gray-900 text-gray-100 text-xs sm:text-sm rounded-lg p-4 pr-24 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-3 right-3 text-xs bg-white/10 hover:bg-white/20 text-gray-100 border border-white/20 rounded px-3 py-1 transition-colors"
        aria-label="埋め込みコードをコピー"
      >
        {copied ? "コピーしました" : "コピー"}
      </button>
    </div>
  );
}
