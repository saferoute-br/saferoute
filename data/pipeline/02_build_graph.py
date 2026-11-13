"""Passo 2: grafo de ruas da área do piloto (OpenStreetMap, via OSMnx).

Saída: nodes.parquet e edges.parquet. Arestas são dirigidas: um registro por
sentido permitido, com geometria orientada da origem para o destino.
"""

import geopandas as gpd
import osmnx as ox
import pandas as pd
from shapely.geometry import LineString

from common import config, out_dir


def first(value):
    return value[0] if isinstance(value, list) else value


def build(mode: str, polygon, speeds: dict, metric_crs: str):
    graph = ox.graph_from_polygon(polygon, network_type=mode, simplify=True)
    nodes, edges = ox.graph_to_gdfs(graph)  # arestas já vêm com geometria u -> v
    edges = edges.reset_index()

    edges["length_m"] = edges.geometry.to_crs(metric_crs).length
    edges = edges[edges["length_m"] > 0]
    edges = edges[edges["u"] != edges["v"]]
    # Arestas paralelas entre os mesmos nós: fica a mais curta.
    edges = edges.sort_values("length_m").drop_duplicates(["u", "v"], keep="first")

    if mode == "walk":
        speed_ms = speeds["walk_kmh"] / 3.6
        edges["time_s"] = edges["length_m"] / speed_ms
    else:
        raise SystemExit("Modo carro entra no M5.")

    out = gpd.GeoDataFrame(
        {
            "mode": mode,
            "source": edges["u"].astype("int64"),
            "target": edges["v"].astype("int64"),
            "osm_way_id": edges["osmid"].map(first).astype("int64"),
            "name": edges["name"].map(first) if "name" in edges else None,
            "highway": edges["highway"].map(first),
            "length_m": edges["length_m"].astype("float32"),
            "time_s": edges["time_s"].astype("float32"),
        },
        geometry=edges.geometry.values,
        crs="EPSG:4326",
    )
    out["name"] = out["name"].where(out["name"].notna(), None)
    assert all(isinstance(g, LineString) for g in out.geometry)
    used = pd.unique(pd.concat([out["source"], out["target"]]))
    nodes = nodes.loc[nodes.index.isin(used), ["geometry"]].rename_axis("id").reset_index()
    return nodes, out


def main() -> None:
    cfg = config("pilot")
    speeds = config("speeds")
    area = gpd.read_parquet(out_dir() / "pilot_area.parquet")
    polygon = area.loc[area["kind"] == "pilot"].geometry.iloc[0]

    all_nodes, all_edges = [], []
    for mode in cfg["modes"]:
        nodes, edges = build(mode, polygon, speeds, cfg["metric_crs"])
        all_nodes.append(nodes)
        all_edges.append(edges)
        km = edges["length_m"].sum() / 1000
        print(f"{mode}: {len(nodes)} nós, {len(edges)} arestas dirigidas, {km:.0f} km.")

    nodes = pd.concat(all_nodes).drop_duplicates("id")
    edges = pd.concat(all_edges, ignore_index=True)
    edges.insert(0, "id", range(1, len(edges) + 1))
    gpd.GeoDataFrame(nodes, crs="EPSG:4326").to_parquet(out_dir() / "nodes.parquet")
    gpd.GeoDataFrame(edges, crs="EPSG:4326").to_parquet(out_dir() / "edges.parquet")


if __name__ == "__main__":
    main()
