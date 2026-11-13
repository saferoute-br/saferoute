"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { bucketFromDate, describeBucket, PERIODS, toBucket } from "@/lib/bucket";
import type { Route } from "@/lib/routes";
import { Onboarding } from "./Onboarding";
import { RouteCard } from "./RouteCard";
import { AboutSheet } from "./AboutSheet";
import { BrandMark, Wordmark } from "./Brand";

const BASE_STYLE = "https://tiles.openfreemap.org/styles/positron";

// Escala de risco: âmbar -> vinho, com a espessura variando junto (item 10.4).
export const LEVELS = [
  { level: 1, color: "#E9B949", width: 4, label: "menor" },
  { level: 2, color: "#DB8A2B", width: 5.5, label: "" },
  { level: 3, color: "#B4472D", width: 7, label: "" },
  { level: 4, color: "#6B1626", width: 8.5, label: "maior" },
] as const;

interface Meta {
  area: {
    name: string;
    geometry: GeoJSON.MultiPolygon;
    bbox: [number, number, number, number];
  };
  run: { data_from: string; data_to: string } | null;
}

type LngLat = [number, number];
type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string; retry?: boolean }
  | { kind: "notice"; message: string };

const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

function pointInRing(p: LngLat, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inArea(p: LngLat, area: GeoJSON.MultiPolygon): boolean {
  return area.coordinates.some(
    (poly) => pointInRing(p, poly[0]) && !poly.slice(1).some((hole) => pointInRing(p, hole)),
  );
}

export function MapApp() {
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<{ o?: Marker; d?: Marker }>({});
  const lib = useRef<typeof import("maplibre-gl") | null>(null);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaTry, setMetaTry] = useState(0);
  const [origin, setOrigin] = useState<LngLat | null>(null);
  const [dest, setDest] = useState<LngLat | null>(null);
  const [now, setNow] = useState(true);
  const [period, setPeriod] = useState(3);
  const [weekend, setWeekend] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [about, setAbout] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const bucket = now ? bucketFromDate(new Date()) : toBucket(period, weekend);

  // 1. Metadados (área do piloto e período dos dados)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/meta")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("meta"))))
      .then((data: Meta) => {
        if (cancelled) return;
        setMeta(data);
        setStatus({ kind: "idle" });
      })
      .catch(() => {
        if (cancelled) return;
        setStatus({
          kind: "error",
          message: "Não foi possível carregar o mapa agora.",
          retry: true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [metaTry]);

  // 2. Mapa
  useEffect(() => {
    if (!meta || !container.current || mapRef.current) return;
    let disposed = false;
    (async () => {
      const maplibre = await import("maplibre-gl");
      if (disposed || !container.current) return;
      lib.current = maplibre;
      maplibre.setWorkerUrl("/maplibre-gl-worker.mjs");
      const [w, s, e, n] = meta.area.bbox;
      const map = new maplibre.Map({
        container: container.current,
        style: BASE_STYLE,
        bounds: [w, s, e, n],
        fitBoundsOptions: { padding: 24 },
        maxBounds: [w - 0.08, s - 0.08, e + 0.08, n + 0.08],
        attributionControl: false,
        dragRotate: false,
        pitchWithRotate: false,
      });
      map.addControl(
        new maplibre.AttributionControl({
          compact: true,
          customAttribution: "Dados: SSP-SP",
        }),
        "top-right",
      );
      // A atribuição começa recolhida (botão "i") para não cobrir a rota no celular.
      const attrib = container.current.querySelector(".maplibregl-ctrl-attrib");
      attrib?.classList.remove("maplibregl-compact-show");
      attrib?.removeAttribute("open");
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;

      map.on("load", () => {
        // Fora da área fica esmaecido (F1).
        const world = [
          [-180, -85],
          [180, -85],
          [180, 85],
          [-180, 85],
          [-180, -85],
        ];
        const holes = meta.area.geometry.coordinates.map((poly) => poly[0]);
        map.addSource("mask", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [world, ...holes] } },
        });
        map.addLayer({
          id: "mask",
          type: "fill",
          source: "mask",
          paint: { "fill-color": "#0B1F44", "fill-opacity": 0.3 },
        });
        map.addSource("area", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: meta.area.geometry },
        });
        map.addLayer({
          id: "area-line",
          type: "line",
          source: "area",
          paint: { "line-color": "#0B1F44", "line-width": 1.5, "line-dasharray": [3, 2] },
        });

        map.addSource("alt", { type: "geojson", data: empty });
        map.addLayer({
          id: "alt",
          type: "line",
          source: "alt",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#7b8794", "line-width": 3, "line-opacity": 0.75 },
        });
        map.addSource("sel", { type: "geojson", data: empty });
        map.addLayer({
          id: "sel-casing",
          type: "line",
          source: "sel",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": ["match", ["get", "level"], 1, 7, 2, 8.5, 3, 10, 4, 11.5, 7],
          },
        });
        map.addLayer({
          id: "sel",
          type: "line",
          source: "sel",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": [
              "match",
              ["get", "level"],
              1, LEVELS[0].color,
              2, LEVELS[1].color,
              3, LEVELS[2].color,
              4, LEVELS[3].color,
              LEVELS[0].color,
            ],
            "line-width": [
              "match",
              ["get", "level"],
              1, LEVELS[0].width,
              2, LEVELS[1].width,
              3, LEVELS[2].width,
              4, LEVELS[3].width,
              LEVELS[0].width,
            ],
          },
        });
        // Referência usada pelos testes de fluxo para converter coordenada em pixel.
        (window as unknown as { __map?: MapLibreMap }).__map = map;
        setMapReady(true);
      });
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [meta]);

  // 3. Toque no mapa: primeiro a origem, depois o destino
  const handleTap = useCallback(
    (p: LngLat) => {
      if (!meta) return;
      if (!inArea(p, meta.area.geometry)) {
        setStatus({
          kind: "notice",
          message: `Por enquanto o SafeRoute cobre só a área demarcada (${meta.area.name}).`,
        });
        return;
      }
      setStatus({ kind: "idle" });
      if (!origin || (origin && dest)) {
        setOrigin(p);
        setDest(null);
        setRoutes([]);
      } else {
        setDest(p);
      }
    },
    [meta, origin, dest],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const onClick = (e: { lngLat: { lng: number; lat: number } }) =>
      handleTap([e.lngLat.lng, e.lngLat.lat]);
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [handleTap, mapReady]);

  // 4. Marcadores
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = lib.current;
    if (!map || !maplibre || !mapReady) return;
    const sync = (key: "o" | "d", point: LngLat | null, text: string) => {
      markers.current[key]?.remove();
      markers.current[key] = undefined;
      if (!point) return;
      const el = document.createElement("div");
      el.className = `pin pin-${key}`;
      el.textContent = text;
      el.setAttribute("aria-label", key === "o" ? "Origem" : "Destino");
      markers.current[key] = new maplibre.Marker({ element: el }).setLngLat(point).addTo(map);
    };
    sync("o", origin, "A");
    sync("d", dest, "B");
  }, [origin, dest, mapReady]);

  // 5. Pedido de rotas
  const [attempt, setAttempt] = useState(0);
  const [settledKey, setSettledKey] = useState("");
  const requestKey = origin && dest ? JSON.stringify([origin, dest, bucket, attempt]) : "";
  const routing = requestKey !== "" && settledKey !== requestKey;
  useEffect(() => {
    if (!origin || !dest) return;
    const controller = new AbortController();
    const key = JSON.stringify([origin, dest, bucket, attempt]);
    fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ o: origin, d: dest, mode: "walk", bucket }),
      signal: controller.signal,
    })
      .then(async (r) => ({ ok: r.ok, body: await r.json() }))
      .then(({ ok, body }) => {
        setSettledKey(key);
        if (!ok) {
          setRoutes([]);
          setStatus({
            kind: "error",
            message: body?.message ?? "Algo deu errado.",
            retry: body?.error === "upstream_timeout",
          });
          return;
        }
        const list: Route[] = body.routes;
        setRoutes(list);
        setSelected(list.length - 1);
        setStatus({ kind: "idle" });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setSettledKey(key);
        setRoutes([]);
        setStatus({
          kind: "error",
          message: "Sem conexão ou servidor lento.",
          retry: true,
        });
      });
    return () => controller.abort();
  }, [origin, dest, bucket, attempt]);

  // 6. Desenho das rotas
  useEffect(() => {
    const map = mapRef.current;
    const maplibre = lib.current;
    if (!map || !maplibre || !mapReady) return;
    const alt = map.getSource("alt") as GeoJSONSource | undefined;
    const sel = map.getSource("sel") as GeoJSONSource | undefined;
    if (!alt || !sel) return;
    const current = routes[selected];
    alt.setData({
      type: "FeatureCollection",
      features: routes
        .filter((_, i) => i !== selected)
        .flatMap((r) =>
          r.segments.map((s) => ({ type: "Feature" as const, properties: {}, geometry: s.geometry })),
        ),
    });
    sel.setData({
      type: "FeatureCollection",
      features: (current?.segments ?? []).map((s) => ({
        type: "Feature" as const,
        properties: { level: s.level },
        geometry: s.geometry,
      })),
    });
    if (current && current.segments.length > 0) {
      const bounds = new maplibre.LngLatBounds();
      for (const r of routes) for (const s of r.segments) for (const c of s.geometry.coordinates) bounds.extend(c);
      const wide = window.innerWidth >= 720;
      const bottom = wide ? 40 : (panel.current?.offsetHeight ?? 300) + 24;
      map.fitBounds(bounds, {
        padding: { top: 110, left: wide ? 440 : 36, right: 36, bottom },
        maxZoom: 17,
      });
    }
  }, [routes, selected, mapReady]);

  const reset = () => {
    setOrigin(null);
    setDest(null);
    setRoutes([]);
    setStatus({ kind: "idle" });
  };

  const hint = !origin
    ? "Toque no mapa para marcar a origem."
    : !dest
      ? "Agora toque no destino."
      : null;
  const allSame = routes.length === 1 && routes[0].profiles.length > 1;

  return (
    <div className="app">
      <div ref={container} className="map" aria-label="Mapa da área coberta" />

      <header className="topbar">
        <BrandMark size={30} />
        <h1>
          <Wordmark />
        </h1>
        <button type="button" className="ghost" onClick={() => setAbout(true)}>
          Sobre os dados
        </button>
      </header>

      <section ref={panel} className="panel" aria-live="polite">
        <span className="signature" aria-hidden="true" />
        <div className="controls">
          <span className="mode" aria-label="Modo: a pé">
            A pé
          </span>
          <label className="field">
            <span className="sr-only">Horário</span>
            <select
              value={now ? "now" : String(period)}
              onChange={(e) => {
                if (e.target.value === "now") setNow(true);
                else {
                  setNow(false);
                  setPeriod(Number(e.target.value));
                }
              }}
            >
              <option value="now">Agora</option>
              {PERIODS.map((p) => (
                <option key={p.index} value={p.index}>
                  {p.label} ({p.hours})
                </option>
              ))}
            </select>
          </label>
          {!now && (
            <label className="field">
              <span className="sr-only">Tipo de dia</span>
              <select value={weekend ? "1" : "0"} onChange={(e) => setWeekend(e.target.value === "1")}>
                <option value="0">Dia útil</option>
                <option value="1">Fim de semana</option>
              </select>
            </label>
          )}
          {(origin || dest) && (
            <button type="button" className="ghost" onClick={reset}>
              Limpar
            </button>
          )}
        </div>

        {hint && status.kind !== "error" && status.kind !== "notice" && meta && <p className="hint">{hint}</p>}
        {routing && <p className="hint">Calculando rotas…</p>}
        {status.kind === "loading" && !meta && <p className="hint">Carregando…</p>}
        {status.kind === "notice" && <p className="notice">{status.message}</p>}
        {status.kind === "error" && !routing && (
          <div className="notice">
            <p>{status.message}</p>
            {status.retry && (
              <button
                type="button"
                onClick={() => (meta ? setAttempt((n) => n + 1) : setMetaTry((n) => n + 1))}
              >
                Tentar de novo
              </button>
            )}
          </div>
        )}

        {routes.length > 0 && (
          <>
            {allSame ? (
              <p className="hint strong">A rota mais rápida já é a de menor risco registrado.</p>
            ) : (
              <p className="hint">Risco registrado para {describeBucket(bucket)}.</p>
            )}
            <ul className="cards">
              {routes.map((route, i) => (
                <li key={route.profiles.join("-")}>
                  <RouteCard
                    route={route}
                    selected={i === selected}
                    single={allSame}
                    onSelect={() => setSelected(i)}
                  />
                </li>
              ))}
            </ul>
            <div className="legend" aria-label="Legenda: risco registrado por trecho">
              <span>Risco registrado:</span>
              {LEVELS.map((l) => (
                <span key={l.level} className="legend-item">
                  <i style={{ background: l.color, height: l.width }} />
                  {l.label}
                </span>
              ))}
            </div>
          </>
        )}
      </section>

      <Onboarding />
      {about && <AboutSheet meta={meta} onClose={() => setAbout(false)} />}
    </div>
  );
}
