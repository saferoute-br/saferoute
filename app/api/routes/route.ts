import { NextResponse } from "next/server";
import { callJson } from "@/lib/db";
import { buildRoutes, type RawRoute } from "@/lib/routes";
import { routeRequestSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, { status: number; message: string }> = {
  invalid_params: { status: 400, message: "Pedido inválido." },
  out_of_area: { status: 422, message: "Ponto fora da área coberta." },
  same_point: { status: 422, message: "Origem e destino estão no mesmo lugar." },
  no_route: { status: 404, message: "Não encontramos caminho entre esses pontos para este modo." },
  upstream_timeout: { status: 504, message: "O servidor demorou para responder. Tente de novo." },
};

function fail(code: keyof typeof ERRORS | string) {
  const known = ERRORS[code] ?? ERRORS.upstream_timeout;
  const error = ERRORS[code] ? code : "upstream_timeout";
  return NextResponse.json({ error, message: known.message }, { status: known.status });
}

// POST (e não GET): origem e destino vão no corpo e não aparecem na URL.
// Nada deste pedido é registrado em log além do código de resultado.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_params");
  }
  const parsed = routeRequestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_params");
  const { o, d, mode, bucket } = parsed.data;

  try {
    const result = await callJson<{ error?: string; routes?: RawRoute[] }>(
      "select get_routes($1, $2, $3, $4, $5, $6) as result",
      [o[0], o[1], d[0], d[1], mode, bucket],
    );
    if (!result || result.error) return fail(result?.error ?? "no_route");
    const routes = buildRoutes(result.routes ?? []);
    if (routes.length === 0) return fail("no_route");
    return NextResponse.json({ routes }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("api/routes falhou:", error instanceof Error ? error.name : "erro");
    return fail("upstream_timeout");
  }
}
