"""Passo 4: limpa, deduplica, classifica e recorta as ocorrências da SSP-SP.

Lê só as colunas necessárias. Nenhuma coluna com dado de pessoa (vítima, autor,
placa, IMEI, documento) nem endereço textual é lida ou gravada.

Saída: crime_events.parquet e crime_stats.json (contagens de descarte).
"""

import hashlib
import json

import geopandas as gpd
import pandas as pd
import pyarrow.parquet as pq

from common import config, data_dir, out_dir

SOURCE = "04 - Dados Tratados/spdados_{year}.parquet"
BASE_COLUMNS = [
    "NOME_DELEGACIA",
    "ANO_BO",
    "NUM_BO",
    "NATUREZA_APURADA",
    "LATITUDE",
    "LONGITUDE",
    "DATA_OCORRENCIA_BO",
    "HORA_OCORRENCIA_BO",
]
# O esquema da SSP muda entre anos: aceitamos os nomes conhecidos de cada coluna.
OPTIONAL = {
    "municipio": ["NOME_MUNICIPIO_CIRCUNCRIÇÃO", "NOME_MUNICIPIO_CIRC", "NOME_MUNICIPIO"],
    "local": ["DESCR_TIPOLOCAL", "DESCR_SUBTIPOLOCAL"],
    "periodo": ["DESC_PERIODO", "DESCR_PERIODO"],
}


def pick(names: list[str], options: list[str]) -> list[str]:
    exact = [o for o in options if o in names]
    if exact:
        return exact
    return [n for n in names if any(n.startswith(o[:18]) for o in options)]


def to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series.astype(str).str.replace(",", ".", regex=False), errors="coerce")


def load_year(year: int, cat: dict, stats: dict, years: list[int]) -> pd.DataFrame:
    path = data_dir() / SOURCE.format(year=year)
    names = [n.strip() for n in pq.ParquetFile(path).schema_arrow.names]
    cols = {key: pick(names, opts) for key, opts in OPTIONAL.items()}
    for key, found in cols.items():
        if not found:
            raise SystemExit(f"{year}: não achei a coluna de {key}. Colunas: {names}")
    wanted = BASE_COLUMNS + [c for found in cols.values() for c in found]
    df = pd.read_parquet(path, columns=wanted)
    s = {"linhas_brutas": int(len(df))}

    df = df[df[cols["municipio"][0]].str.upper().str.strip() == cat["municipality"]]
    nat = df["NATUREZA_APURADA"].str.upper().str.strip()
    keep = nat.str.contains("|".join(cat["include_any"]), regex=True) & ~nat.str.contains(
        "|".join(cat["exclude_any"]), regex=True
    )
    df = df[keep].assign(NAT=nat[keep])
    s["roubo_furto_municipio"] = int(len(df))

    df = df.drop_duplicates(["NOME_DELEGACIA", "ANO_BO", "NUM_BO", "NAT"])
    s["apos_deduplicar"] = int(len(df))

    df["category"] = df["NAT"].map(cat["categories"])
    s["sem_categoria"] = int(df["category"].isna().sum())
    df = df[df["category"].notna()]

    box = cat["valid_box"]
    df["lat"] = to_number(df["LATITUDE"])
    df["lon"] = to_number(df["LONGITUDE"])
    ok = df["lat"].between(box["lat_min"], box["lat_max"]) & df["lon"].between(
        box["lon_min"], box["lon_max"]
    )
    s["sem_coordenada_valida"] = int((~ok).sum())
    df = df[ok]

    # Ponto repetido muitas vezes no município: suspeito de ser centroide.
    rep = df.groupby(["lat", "lon"])["lat"].transform("size")
    df["suspect_point"] = rep >= cat["suspect_repeat_threshold"]

    date = pd.to_datetime(df["DATA_OCORRENCIA_BO"], errors="coerce")
    s["sem_data"] = int(date.isna().sum())
    df = df[date.notna()].assign(when=date[date.notna()])
    # BO registrado no ano sobre fato antigo: fora do período do modelo.
    in_period = df["when"].dt.year.isin(years)
    s["fora_do_periodo"] = int((~in_period).sum())
    df = df[in_period]
    df["occurred_on"] = df["when"].dt.date
    df["is_weekend"] = df["when"].dt.day_of_week >= 5

    hora = df["HORA_OCORRENCIA_BO"].astype(str)
    df["hour"] = pd.to_numeric(hora.str.slice(0, 2), errors="coerce").where(
        hora.str.match(r"^\d{2}:\d{2}")
    )
    df.loc[~df["hour"].between(0, 23), "hour"] = pd.NA
    labels = {k.upper(): v for k, v in cat["period_labels"].items()}
    periodo = pd.Series(pd.NA, index=df.index, dtype="Int64")
    for col in cols["periodo"]:
        periodo = periodo.fillna(df[col].astype(str).str.upper().str.strip().map(labels))
    df["period"] = (df["hour"] // 6).astype("Int64").fillna(periodo)
    df["hour"] = df["hour"].astype("Int64")

    local = pd.Series("", index=df.index)
    for col in cols["local"]:
        local = local + " " + df[col].astype(str).str.lower()
    df["public_way"] = local.str.contains(cat["public_way_contains"], regex=False)

    def key(row) -> str:
        raw = f"{row.NOME_DELEGACIA}|{row.ANO_BO}|{row.NUM_BO}|{row.NAT}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]

    df["bo_key"] = [key(r) for r in df.itertuples()]
    df["src_year"] = year
    stats[str(year)] = s
    return df[
        [
            "bo_key", "category", "occurred_on", "hour", "period", "is_weekend",
            "public_way", "suspect_point", "src_year", "lat", "lon",
        ]
    ]


def main() -> None:
    cat = config("categories")
    risk = config("risk")
    stats: dict = {}
    df = pd.concat([load_year(y, cat, stats, risk["years"]) for y in risk["years"]], ignore_index=True)
    df = df.drop_duplicates("bo_key")

    gdf = gpd.GeoDataFrame(
        df.drop(columns=["lat", "lon"]),
        geometry=gpd.points_from_xy(df["lon"], df["lat"]),
        crs="EPSG:4326",
    )
    area = gpd.read_parquet(out_dir() / "pilot_area.parquet")
    crime_area = area.loc[area["kind"] == "crime"].geometry.iloc[0]
    gdf = gdf[gdf.within(crime_area)].reset_index(drop=True)

    stats["area"] = {
        "ocorrencias_na_area": int(len(gdf)),
        "por_ano": {str(k): int(v) for k, v in gdf["src_year"].value_counts().items()},
        "por_categoria": {k: int(v) for k, v in gdf["category"].value_counts().items()},
        "pct_via_publica": round(float(gdf["public_way"].mean()) * 100, 1),
        "pct_com_hora": round(float(gdf["hour"].notna().mean()) * 100, 1),
        "pct_com_periodo": round(float(gdf["period"].notna().mean()) * 100, 1),
        "pct_ponto_suspeito": round(float(gdf["suspect_point"].mean()) * 100, 1),
        "data_from": str(gdf["occurred_on"].min()),
        "data_to": str(gdf["occurred_on"].max()),
    }
    gdf.to_parquet(out_dir() / "crime_events.parquet")
    (out_dir() / "crime_stats.json").write_text(
        json.dumps(stats, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(json.dumps(stats, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
