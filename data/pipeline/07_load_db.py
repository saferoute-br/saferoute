"""Carga em lote no banco e criação da credencial do servidor do app.

Uso:
  python 07_load_db.py            carrega (só se as tabelas estiverem vazias)
  python 07_load_db.py --replace  apaga e recarrega (peça aprovação antes: regra 6)
  python 07_load_db.py --app-role define a senha do papel app_api e grava
                                  DATABASE_URL em .env.local (sem mostrar na tela)

Lê PIPELINE_DATABASE_URL de .env.local. Nunca imprime credenciais.
"""

import json
import secrets
import sys
from urllib.parse import quote

import geopandas as gpd
import pandas as pd
import psycopg
import shapely
from psycopg import sql

from common import REPO, config, connection_parts, database_url, out_dir, project_ref

TABLES = ["edge_risk", "crime_events", "edges", "nodes", "risk_runs", "pilot_area"]


def hexwkb(series) -> list[str]:
    return list(shapely.to_wkb(shapely.set_srid(series.values, 4326), hex=True, include_srid=True))


def copy_rows(cur, table: str, columns: list[str], rows) -> None:
    stmt = sql.SQL("copy {} ({}) from stdin").format(
        sql.Identifier(table), sql.SQL(", ").join(map(sql.Identifier, columns))
    )
    with cur.copy(stmt) as copy:
        for row in rows:
            copy.write_row(row)


def none(value):
    return None if pd.isna(value) else value


def load(replace: bool) -> None:
    out = out_dir()
    area = gpd.read_parquet(out / "pilot_area.parquet")
    nodes = gpd.read_parquet(out / "nodes.parquet")
    edges = gpd.read_parquet(out / "edges.parquet")
    crimes = gpd.read_parquet(out / "crime_events.parquet")
    risk = pd.read_parquet(out / "edge_risk.parquet")
    run = json.loads((out / "risk_run.json").read_text(encoding="utf-8"))
    pilot_cfg = config("pilot")

    with psycopg.connect(database_url(), prepare_threshold=None) as conn, conn.cursor() as cur:
        cur.execute("set search_path = public, extensions")
        cur.execute("select count(*) from edges")
        existing = cur.fetchone()[0]
        if existing and not replace:
            sys.exit(f"O banco já tem {existing} arestas. Use --replace para recarregar.")
        if replace:
            cur.execute("update app_config set active_run_id = null")
            cur.execute("truncate " + ", ".join(TABLES) + " restart identity cascade")

        pilot = area[area["kind"] == "pilot"]
        cur.execute(
            "insert into pilot_area (id, name, buffer_m, geom) values (1, %s, %s, %s::geometry)",
            (pilot_cfg["name"], pilot_cfg["buffer_m"], hexwkb(pilot.geometry)[0]),
        )
        copy_rows(cur, "nodes", ["id", "geom"], zip(nodes["id"].astype(int), hexwkb(nodes.geometry)))
        copy_rows(
            cur,
            "edges",
            ["id", "mode", "source", "target", "osm_way_id", "name", "highway", "length_m", "time_s", "geom"],
            (
                (int(r.id), r.mode, int(r.source), int(r.target), int(r.osm_way_id),
                 none(r.name), none(r.highway), float(r.length_m), float(r.time_s), g)
                for r, g in zip(edges.itertuples(), hexwkb(edges.geometry))
            ),
        )
        cur.execute("select setval(pg_get_serial_sequence('edges', 'id'), (select max(id) from edges))")
        copy_rows(
            cur,
            "crime_events",
            ["bo_key", "category", "occurred_on", "hour", "period", "is_weekend",
             "public_way", "suspect_point", "geom"],
            (
                (r.bo_key, r.category, r.occurred_on, none(r.hour), none(r.period),
                 bool(r.is_weekend), bool(r.public_way), bool(r.suspect_point), g)
                for r, g in zip(crimes.itertuples(), hexwkb(crimes.geometry))
            ),
        )
        cur.execute(
            "insert into risk_runs (params, metrics, data_from, data_to) values (%s, %s, %s, %s) returning id",
            (json.dumps(run["params"]), json.dumps(run["metrics"]), run["data_from"], run["data_to"]),
        )
        run_id = cur.fetchone()[0]
        copy_rows(
            cur,
            "edge_risk",
            ["run_id", "edge_id", "bucket", "n_events", "density", "score", "confidence", "components"],
            (
                (run_id, int(r.edge_id), int(r.bucket), int(r.n_events), float(r.density),
                 float(r.score), float(r.confidence), r.components)
                for r in risk.itertuples()
            ),
        )
        cur.execute(
            "insert into app_config (id, active_run_id) values (1, %s) "
            "on conflict (id) do update set active_run_id = excluded.active_run_id",
            (run_id,),
        )
        for table in ["nodes", "edges", "crime_events", "edge_risk"]:
            cur.execute(sql.SQL("analyze {}").format(sql.Identifier(table)))
        conn.commit()
        cur.execute(
            "select (select count(*) from nodes), (select count(*) from edges), "
            "(select count(*) from crime_events), (select count(*) from edge_risk)"
        )
        n = cur.fetchone()
        print(f"Carga concluída: {n[0]} nós, {n[1]} arestas, {n[2]} ocorrências, {n[3]} linhas de risco. Run {run_id} ativo.")


def app_role() -> None:
    parts = connection_parts()
    ref = project_ref()
    password = secrets.token_urlsafe(30)  # só letras, números, "-" e "_"
    with psycopg.connect(database_url(), prepare_threshold=None) as conn, conn.cursor() as cur:
        cur.execute(sql.SQL("alter role app_api with login password {}").format(sql.Literal(password)))
        cur.execute("alter role app_api set statement_timeout = '5s'")
        conn.commit()

    # No pooler do Supabase o usuário é "papel.identificador-do-projeto" e o
    # modo transação fica na porta 6543.
    host = parts["host"]
    pooler = "pooler" in (host or "")
    user = f"app_api.{ref}" if pooler and ref else "app_api"
    port = 6543 if pooler else (parts["port"] or 5432)
    app_url = f"postgresql://{user}:{quote(password)}@{host}:{port}/{parts['dbname'] or 'postgres'}"

    env = REPO / ".env.local"
    lines = env.read_text(encoding="utf-8").splitlines() if env.exists() else []
    lines = [l for l in lines if not l.startswith("DATABASE_URL=")]
    lines.append(f"DATABASE_URL={app_url}")
    env.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Senha do app_api definida e DATABASE_URL gravada em .env.local (valor não exibido).")


if __name__ == "__main__":
    if "--app-role" in sys.argv:
        app_role()
    else:
        load(replace="--replace" in sys.argv)
