import { expect, test } from "vitest";
import { buildRoutes, scoreToLevel, type RawRoute } from "@/lib/routes";
import { routeRequestSchema } from "@/lib/schema";
import fixture from "../fixtures/demo.json";

const line = { type: "LineString" as const, coordinates: [[0, 0], [1, 1]] as [number, number][] };
const seg = (edge_id: number, score = 0) => ({ edge_id, score, geometry: line });

test("níveis de cor seguem os limites 0,5 / 0,8 / 0,95", () => {
  expect(scoreToLevel(0)).toBe(1);
  expect(scoreToLevel(0.5)).toBe(1);
  expect(scoreToLevel(0.51)).toBe(2);
  expect(scoreToLevel(0.9)).toBe(3);
  expect(scoreToLevel(0.99)).toBe(4);
});

test("rotas idênticas são fundidas em um cartão", () => {
  const same: RawRoute[] = ["fast", "balanced", "safer"].map((profile) => ({
    profile,
    label: profile,
    time_s: 600,
    length_m: 800,
    exposure: 100,
    segments: [seg(1), seg(2)],
  }));
  const routes = buildRoutes(same);
  expect(routes).toHaveLength(1);
  expect(routes[0].profiles).toEqual(["fast", "balanced", "safer"]);
});

test("calcula a variação de tempo e de exposição contra a mais rápida", () => {
  const routes = buildRoutes([
    { profile: "fast", label: "Mais rápida", time_s: 600, length_m: 800, exposure: 200, segments: [seg(1, 0.9)] },
    { profile: "safer", label: "Menor risco", time_s: 660, length_m: 880, exposure: 140, segments: [seg(2, 0.2)] },
  ]);
  expect(routes[0]).toMatchObject({ time_delta_s: 0, time_delta_pct: 0, exposure_delta_pct: 0 });
  expect(routes[1]).toMatchObject({ time_delta_s: 60, time_delta_pct: 10, exposure_delta_pct: -30 });
  expect(routes[1].segments[0].level).toBe(1);
});

test("a exposição bruta nunca sai na resposta", () => {
  const routes = buildRoutes(fixture.raw_routes as RawRoute[]);
  expect(routes).toHaveLength(3);
  for (const route of routes) expect(route).not.toHaveProperty("exposure");
  expect(routes[2].exposure_delta_pct).toBeLessThan(0);
});

test("o pedido de rota rejeita entradas inválidas ou maliciosas", () => {
  const ok = { o: [-46.57, -23.54], d: [-46.56, -23.53], mode: "walk", bucket: 6 };
  expect(routeRequestSchema.safeParse(ok).success).toBe(true);
  const bad = [
    { ...ok, o: ["-46.57", "-23.54"] },
    { ...ok, o: [-46.57, 123] },
    { ...ok, mode: "' OR 1=1 --" },
    { ...ok, bucket: 8 },
    { ...ok, bucket: 1.5 },
    { o: ok.o, d: ok.d },
    "texto",
  ];
  for (const body of bad) expect(routeRequestSchema.safeParse(body).success).toBe(false);
});
