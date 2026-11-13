"""Testes de exemplo do M0: guardas das regras 3, 4 e 13 do CLAUDE.md."""

from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]

TABELAS = [
    "pilot_area",
    "nodes",
    "edges",
    "crime_events",
    "risk_runs",
    "edge_risk",
    "routing_profiles",
    "app_config",
]


def test_env_example_nao_tem_valores():
    linhas = (RAIZ / ".env.example").read_text(encoding="utf-8").splitlines()
    variaveis = [l for l in linhas if l.strip() and not l.lstrip().startswith("#")]
    assert variaveis, ".env.example deveria listar as variáveis esperadas"
    for linha in variaveis:
        nome, _, valor = linha.partition("=")
        assert valor.strip() == "", f"{nome} não pode ter valor no .env.example"
        assert not nome.startswith("NEXT_PUBLIC_"), f"{nome} exporia o valor no navegador"


def test_gitignore_bloqueia_segredos_e_dados_brutos():
    regras = (RAIZ / ".gitignore").read_text(encoding="utf-8").splitlines()
    for esperado in [".env*", "*.xlsx", "*.parquet", "*.gpkg"]:
        assert esperado in regras, f"{esperado} precisa estar no .gitignore"


def test_migracao_inicial_liga_rls_em_todas_as_tabelas():
    caminho = RAIZ / "supabase" / "migrations" / "0001_init.sql"
    sql = " ".join(caminho.read_text(encoding="utf-8").split())
    for tabela in TABELAS:
        assert f"create table {tabela} (" in sql, f"falta a tabela {tabela}"
        assert (
            f"alter table {tabela} enable row level security;" in sql
        ), f"RLS desligado em {tabela}"
