import type { Route } from "@/lib/routes";

function minutes(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

function distance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`
    : `${Math.round(meters / 10) * 10} m`;
}

export function comparison(route: Route): string {
  if (route.profiles.includes("fast")) return "Referência de tempo";
  const extra = Math.round(route.time_delta_s / 60);
  const time = extra <= 0 ? "mesmo tempo" : `+${extra} min`;
  const e = route.exposure_delta_pct;
  const exposure =
    e === 0 ? "mesma exposição" : `${e > 0 ? "+" : "−"}${Math.abs(e)}% de exposição`;
  return `${time} · ${exposure}`;
}

export function RouteCard({
  route,
  selected,
  single,
  onSelect,
}: {
  route: Route;
  selected: boolean;
  single: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`card${selected ? " card-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="card-title">{single ? "Rota" : route.label}</span>
      <span className="card-main">
        {minutes(route.time_s)} <small>{distance(route.length_m)}</small>
      </span>
      {!single && <span className="card-compare">{comparison(route)}</span>}
    </button>
  );
}
