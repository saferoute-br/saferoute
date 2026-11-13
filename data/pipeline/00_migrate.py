"""Aplica as migrações de supabase/migrations/ no banco de PIPELINE_DATABASE_URL.

Uso:
  python 00_migrate.py --check   só mostra qual é o projeto e o que falta aplicar
  python 00_migrate.py           aplica as migrações pendentes

Travas (regra 18 do CLAUDE.md):
- o identificador do projeto na string de conexão precisa ser o anotado no CLAUDE.md;
- nunca imprime a senha nem a string de conexão.

O controle usa a mesma tabela da CLI do Supabase (supabase_migrations.schema_migrations),
então a CLI pode assumir depois sem reaplicar nada.
"""

import re
import sys
import psycopg

from common import REPO, connection_parts, database_url, project_ref

MIGRATIONS = REPO / "supabase" / "migrations"


def expected_ref() -> str:
    text = (REPO / "CLAUDE.md").read_text(encoding="utf-8")
    match = re.search(r"Projeto Supabase do SafeRoute: `([a-z0-9]{15,})`", text)
    return match.group(1) if match else ""


def main() -> None:
    check_only = "--check" in sys.argv
    url = database_url()
    ref = project_ref()
    host = connection_parts()["host"]
    print(f"Projeto na string de conexão: {ref or '(não identificado)'} · servidor: {host}")

    with psycopg.connect(url, prepare_threshold=None, autocommit=False) as conn, conn.cursor() as cur:
        cur.execute("select current_database(), current_user, version()")
        db, user, version = cur.fetchone()
        cur.execute(
            "select count(*) from information_schema.tables "
            "where table_schema = 'public' and table_type = 'BASE TABLE'"
        )
        n_tables = cur.fetchone()[0]
        cur.execute("select to_regclass('supabase_migrations.schema_migrations') is not null")
        has_control = cur.fetchone()[0]
        applied = set()
        if has_control:
            cur.execute("select version from supabase_migrations.schema_migrations")
            applied = {r[0] for r in cur.fetchall()}
        conn.rollback()
        print(f"Banco: {db} · usuário: {user.split('.')[0]} · {version.split(',')[0]}")
        print(f"Tabelas em public: {n_tables} · migrações já aplicadas: {sorted(applied) or 'nenhuma'}")

        files = sorted(MIGRATIONS.glob("*.sql"))
        pending = [f for f in files if f.name.split("_", 1)[0] not in applied]
        print("Pendentes:", [f.name for f in pending] or "nenhuma")
        if check_only:
            return

        if not ref or ref != expected_ref():
            sys.exit("O identificador do projeto não confere com o anotado no CLAUDE.md. Nada foi aplicado.")
        if not applied and n_tables > 0:
            sys.exit("O banco já tem tabelas e nenhuma migração registrada: não parece um projeto novo. Nada foi aplicado.")

        cur.execute("create schema if not exists supabase_migrations")
        cur.execute(
            "create table if not exists supabase_migrations.schema_migrations "
            "(version text primary key, statements text[], name text)"
        )
        for f in pending:
            version, name = f.stem.split("_", 1)
            cur.execute(f.read_text(encoding="utf-8"))
            cur.execute(
                "insert into supabase_migrations.schema_migrations (version, name) values (%s, %s)",
                (version, name),
            )
            conn.commit()
            print(f"Aplicada: {f.name}")

        cur.execute("select extensions.postgis_version()")
        print("postgis_version():", cur.fetchone()[0])
        cur.execute("select extensions.pgr_version()")
        print("pgr_version():", cur.fetchone()[0])


if __name__ == "__main__":
    main()
