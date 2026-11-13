import { NextResponse } from "next/server";
import { callJson } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const meta = await callJson<Record<string, unknown>>("select get_meta() as result");
    if (!meta?.area) throw new Error("meta vazio");
    return NextResponse.json(meta, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("api/meta falhou:", error instanceof Error ? error.name : "erro");
    return NextResponse.json(
      { error: "unavailable", message: "Serviço indisponível. Tente de novo em instantes." },
      { status: 503 },
    );
  }
}
