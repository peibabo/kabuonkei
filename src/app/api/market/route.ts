import { NextResponse } from "next/server";
import { fetchAllMarketData } from "@/lib/market-data";

export const revalidate = 900; // ISR: 15分

export async function GET() {
  try {
    const data = await fetchAllMarketData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Market data fetch error:", error);
    return NextResponse.json(
      { error: "市場データの取得に失敗しました" },
      { status: 500 }
    );
  }
}
