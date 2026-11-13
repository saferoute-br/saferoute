"""Funções comuns do pipeline: configuração e caminhos.

Nenhum caminho de dados fica fixo no código: tudo vem de SAFEROUTE_DATA_DIR.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from ruamel.yaml import YAML

REPO = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPO / "data" / "config"


def load_env_file() -> None:
    """Lê .env.local da raiz do repositório, sem sobrescrever o ambiente."""
    env = REPO / ".env.local"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip('"').strip("'")
        if value and key.strip() not in os.environ:
            os.environ[key.strip()] = value


def config(name: str) -> dict:
    yaml = YAML(typ="safe")
    with open(CONFIG_DIR / f"{name}.yaml", encoding="utf-8") as fh:
        return yaml.load(fh)


def data_dir() -> Path:
    load_env_file()
    value = os.environ.get("SAFEROUTE_DATA_DIR")
    if not value:
        sys.exit("Defina SAFEROUTE_DATA_DIR (veja .env.example e data/README.md).")
    path = Path(value)
    if not path.is_dir():
        sys.exit("SAFEROUTE_DATA_DIR não aponta para uma pasta existente.")
    return path


def out_dir() -> Path:
    """Pasta de saídas intermediárias do pipeline (fora do repositório)."""
    path = data_dir() / "04 - Dados Tratados" / "pipeline"
    path.mkdir(parents=True, exist_ok=True)
    return path


def database_url() -> str:
    load_env_file()
    value = os.environ.get("PIPELINE_DATABASE_URL")
    if not value:
        sys.exit("Defina PIPELINE_DATABASE_URL em .env.local (veja .env.example).")
    return value


def connection_parts() -> dict:
    """Partes da conexão (host, porta, usuário, banco) lidas pelo próprio driver.

    Não usa urlsplit: senhas com "/", "#" ou "?" confundem o analisador de URL.
    Nunca devolve a senha.
    """
    from psycopg.conninfo import conninfo_to_dict

    parts = conninfo_to_dict(database_url())
    return {k: parts.get(k) for k in ("host", "port", "user", "dbname")}


def project_ref() -> str:
    import re

    parts = connection_parts()
    user = parts.get("user") or ""
    if "." in user:  # pooler: postgres.<identificador>
        return user.split(".", 1)[1]
    match = re.match(r"db\.([a-z0-9]+)\.supabase\.co", parts.get("host") or "")
    return match.group(1) if match else ""
