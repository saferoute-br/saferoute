// Pós-processamento das rotas vindas do banco: níveis de cor, fusão de rotas
// idênticas e comparação contra a rota mais rápida. A exposição bruta nunca
// sai do servidor; a tela só recebe a variação percentual (item 8 da SPEC).

export type Level = 1 | 2 | 3 | 4;

export interface RawSegment {
  edge_id: number;
  score: number;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

export interface RawRoute {
  profile: string;
  label: string;
  time_s: number;
  length_m: number;
  exposure: number;
  segments: RawSegment[];
}

export interface RouteSegment {
  edge_id: number;
  level: Level;
  geometry: RawSegment["geometry"];
}

export interface Route {
  profiles: string[];
  label: string;
  time_s: number;
  length_m: number;
  time_delta_s: number;
  time_delta_pct: number;
  exposure_delta_pct: number;
  segments: RouteSegment[];
}

// Limites dos níveis [HIPÓTESE], iguais a data/config/risk.yaml.
const THRESHOLDS = [0.5, 0.8, 0.95];

export function scoreToLevel(score: number): Level {
  if (score > THRESHOLDS[2]) return 4;
  if (score > THRESHOLDS[1]) return 3;
  if (score > THRESHOLDS[0]) return 2;
  return 1;
}

function pct(value: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round(((value - base) / base) * 100);
}

export function buildRoutes(raw: RawRoute[]): Route[] {
  if (raw.length === 0) return [];
  const fast = raw.find((r) => r.profile === "fast") ?? raw[0];

  const merged = new Map<string, { route: RawRoute; profiles: string[]; labels: string[] }>();
  for (const route of raw) {
    const key = route.segments.map((s) => s.edge_id).join(",");
    const found = merged.get(key);
    if (found) {
      found.profiles.push(route.profile);
      found.labels.push(route.label);
    } else {
      merged.set(key, { route, profiles: [route.profile], labels: [route.label] });
    }
  }

  return [...merged.values()].map(({ route, profiles, labels }) => ({
    profiles,
    label: labels.join(" · "),
    time_s: route.time_s,
    length_m: route.length_m,
    time_delta_s: Math.round(route.time_s - fast.time_s),
    time_delta_pct: pct(route.time_s, fast.time_s),
    exposure_delta_pct: pct(route.exposure, fast.exposure),
    segments: route.segments.map((s) => ({
      edge_id: s.edge_id,
      level: scoreToLevel(s.score),
      geometry: s.geometry,
    })),
  }));
}
