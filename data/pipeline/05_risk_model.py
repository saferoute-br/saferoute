"""Passo 5: modelo de risco v0 por trecho e faixa de tempo (item 7 da SPEC).

peso(e,b) = soma, sobre ocorrências a até R metros do trecho, de
            k(d) * s(categoria) * r(ano) * t(faixa) * c(ponto suspeito)
densidade = peso / max(comprimento, piso)
score     = posição percentual da densidade entre todos os trechos e faixas do modo

Saída: edge_risk.parquet (só linhas com peso > 0) e risk_run.json.
"""

import json

import geopandas as gpd
import numpy as np
import pandas as pd
import shapely
from shapely import STRtree

from common import config, out_dir

N_BUCKETS = 8  # bucket = period * 2 + (1 se fim de semana)


def main() -> None:
    cfg = config("risk")
    pilot = config("pilot")
    crs = pilot["metric_crs"]
    R = float(cfg["radius_m"])

    edges_all = gpd.read_parquet(out_dir() / "edges.parquet")
    crimes_all = gpd.read_parquet(out_dir() / "crime_events.parquet").to_crs(crs)
    crimes_all = crimes_all[crimes_all["src_year"].isin(cfg["years"])]

    frames, summary = [], {}
    for mode, mcfg in cfg["modes"].items():
        edges = edges_all[edges_all["mode"] == mode].reset_index(drop=True)
        ev = crimes_all[crimes_all["category"].isin(mcfg["categories"].keys())]
        if mcfg.get("public_way_only"):
            ev = ev[ev["public_way"]]
        ev = ev.reset_index(drop=True)

        geoms = edges.geometry.to_crs(crs).values
        tree = STRtree(geoms)
        pts = ev.geometry.values
        ev_idx, edge_idx = tree.query(pts, predicate="dwithin", distance=R)
        dist = shapely.distance(pts[ev_idx], geoms[edge_idx])

        k = 1.0 - dist / R
        cat = ev["category"].astype(str).to_numpy(dtype=object)[ev_idx]
        is_roubo = ev["category"].astype(str).str.startswith("roubo").to_numpy(dtype=bool)[ev_idx]
        s = np.where(
            is_roubo,
            cfg["severity"]["roubo"],
            cfg["severity"]["furto"],
        )
        cat_w = np.array([mcfg["categories"][c] for c in cat])
        r = ev["src_year"].map({int(y): w for y, w in cfg["year_weights"].items()}).to_numpy(dtype=float)[ev_idx]
        c = np.where(ev["suspect_point"].to_numpy(dtype=bool)[ev_idx], cfg["suspect_weight"], 1.0)
        base = k * s * cat_w * r * c

        weekend = ev["is_weekend"].to_numpy(dtype=bool)[ev_idx].astype(int)
        period = ev["period"].astype("Float64").to_numpy(dtype=float, na_value=np.nan)[ev_idx]
        categories = sorted(mcfg["categories"].keys())
        cat_pos = np.array([categories.index(x) for x in cat])

        n_edges = len(edges)
        weight = np.zeros((n_edges, N_BUCKETS))
        count = np.zeros((n_edges, N_BUCKETS))
        comp = np.zeros((n_edges, N_BUCKETS, len(categories)))
        for p in range(4):
            # t = 1 se a ocorrência é do período; 1/4 em cada período se só a data é conhecida
            t = np.where(period == p, 1.0, np.where(np.isnan(period), 0.25, 0.0))
            bucket = p * 2 + weekend
            np.add.at(weight, (edge_idx, bucket), base * t)
            np.add.at(count, (edge_idx, bucket), t)
            np.add.at(comp, (edge_idx, bucket, cat_pos), t)

        if cfg.get("normalize_by_days"):
            days = np.array([5.0, 2.0] * 4)  # dia útil, fim de semana
            weight = weight / days

        length = np.maximum(edges["length_m"].values, cfg["min_length_m"])
        density = weight / length[:, None]
        flat = pd.Series(density.ravel())
        score = flat.rank(pct=True, method="average").where(flat > 0, 0.0).values.reshape(density.shape)

        e_i, b_i = np.nonzero(weight > 0)
        n_events = np.rint(count[e_i, b_i]).astype(int)
        frames.append(
            pd.DataFrame(
                {
                    "edge_id": edges["id"].values[e_i],
                    "bucket": b_i.astype("int16"),
                    "n_events": n_events,
                    "density": density[e_i, b_i].astype("float32"),
                    "score": np.clip(score[e_i, b_i], 0, 1).astype("float32"),
                    "confidence": np.minimum(1.0, n_events / cfg["confidence_events"]).astype("float32"),
                    "components": [
                        json.dumps(
                            {categories[j]: int(round(comp[e, b, j])) for j in range(len(categories))}
                        )
                        for e, b in zip(e_i, b_i)
                    ],
                }
            )
        )
        summary[mode] = {
            "ocorrencias_usadas": int(len(ev)),
            "ocorrencias_perto_de_trecho": int(len(np.unique(ev_idx))),
            "trechos": int(n_edges),
            "trechos_com_risco_em_alguma_faixa": int((weight.sum(axis=1) > 0).sum()),
            "linhas_edge_risk": int(len(e_i)),
            "score_medio_por_faixa": [round(float(x), 3) for x in score.mean(axis=0)],
        }

    out = pd.concat(frames, ignore_index=True)
    out.to_parquet(out_dir() / "edge_risk.parquet")
    stats = json.loads((out_dir() / "crime_stats.json").read_text(encoding="utf-8"))
    run = {
        "params": cfg,
        "metrics": {"resumo": summary, "descartes": stats},
        "data_from": stats["area"]["data_from"],
        "data_to": stats["area"]["data_to"],
    }
    (out_dir() / "risk_run.json").write_text(
        json.dumps(run, ensure_ascii=False, indent=1, default=str), encoding="utf-8"
    )
    print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
