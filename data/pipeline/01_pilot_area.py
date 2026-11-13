"""Passo 1: polígono da área do piloto (distrito + faixa)."""

import geopandas as gpd
from shapely.geometry import MultiPolygon

from common import config, data_dir, out_dir


def main() -> None:
    cfg = config("pilot")
    gdf = gpd.read_file(data_dir() / cfg["district_file"])
    col = cfg["district_code_column"]
    sel = gdf[gdf[col].astype(str) == str(cfg["district_code"])]
    if len(sel) != 1:
        raise SystemExit(f"Esperava 1 distrito com {col}={cfg['district_code']}, achei {len(sel)}.")

    metric = sel.to_crs(cfg["metric_crs"])
    area = metric.buffer(cfg["buffer_m"]).union_all()
    crime_area = metric.buffer(cfg["buffer_m"] + cfg["crime_margin_m"]).union_all()

    def as_multi(geom):
        return geom if isinstance(geom, MultiPolygon) else MultiPolygon([geom])

    out = gpd.GeoDataFrame(
        {
            "kind": ["pilot", "crime"],
            "name": [cfg["name"], cfg["name"]],
            "buffer_m": [cfg["buffer_m"], cfg["buffer_m"] + cfg["crime_margin_m"]],
        },
        geometry=[as_multi(area), as_multi(crime_area)],
        crs=cfg["metric_crs"],
    ).to_crs("EPSG:4326")
    out.to_parquet(out_dir() / "pilot_area.parquet")
    km2 = area.area / 1e6
    print(f"Área do piloto gravada: {km2:.2f} km² (distrito + {cfg['buffer_m']} m).")


if __name__ == "__main__":
    main()
