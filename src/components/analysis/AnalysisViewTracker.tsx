"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** 分析記事の表示を GA4 に送るだけの部品（本文が Server Component の記事用） */
export default function AnalysisViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackEvent("analysis_view", { slug });
  }, [slug]);
  return null;
}
