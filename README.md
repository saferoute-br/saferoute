# SafeRoute

App web (PWA) de código aberto que compara rotas pelo **risco registrado** de roubo e furto, usando dados públicos da SSP-SP. O piloto cobre uma área pequena de São Paulo, definida em configuração.

> O SafeRoute mostra onde houve mais registros de roubo e furto. Ele não prevê crimes e não garante segurança em nenhum caminho. O risco é calculado por trecho de rua e por período; o app não classifica bairros.

**Demonstração:** https://saferoute-nine-theta.vercel.app

**Estado atual:** demonstração enxuta. Funciona o modo a pé: a pessoa toca em dois pontos do mapa e vê até três rotas (mais rápida, equilibrada e de menor risco registrado), com tempo, distância e variação de exposição. Ainda não há modo carro, busca por endereço, explicação por trecho nem relatório de validação. O plano completo está em [`docs/SPEC.md`](docs/SPEC.md) e as decisões em [`docs/DECISIONS.md`](docs/DECISIONS.md).

## Tecnologias

- Interface e servidor: Next.js (App Router) + TypeScript
- Mapa: MapLibre GL JS com mapa-base OpenFreeMap
- Banco: Postgres com PostGIS e pgRouting (Supabase)
- Pipeline de dados: Python 3.11+
- Testes: Vitest, Playwright e pytest

## Como rodar no seu computador

Pré-requisitos: Node.js LTS, Python 3.11 ou mais novo e Git.

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Testes e verificações

| Comando | O que faz |
|---|---|
| `npm run lint` | Confere o estilo do código |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm test` | Testes de unidade (Vitest) |
| `npm run test:e2e` | Fluxo completo em tela de celular (Playwright). Na primeira vez: `npx playwright install chromium` |
| `npm run test:data` | Testes do pipeline de dados (pytest). Na primeira vez: `pip install -r requirements-dev.txt` |

A integração contínua (GitHub Actions) roda tudo isso a cada envio.

## Estrutura

```
app/                  telas e rotas de API (Next.js)
components/           componentes de interface
lib/                  utilitários e validação
supabase/migrations/  esquema do banco, em arquivos SQL numerados
data/pipeline/        scripts do pipeline de dados
data/config/          parâmetros do modelo
docs/                 especificação e decisões
tests/                unit (Vitest), e2e (Playwright), data (pytest)
```

## Pipeline de dados

Roda no computador que tem os dados brutos (`pip install -r requirements.txt`), na ordem:

| Script | O que faz |
|---|---|
| `data/pipeline/01_pilot_area.py` | Polígono da área do piloto |
| `data/pipeline/02_build_graph.py` | Grafo de ruas do OpenStreetMap |
| `data/pipeline/04_load_crimes.py` | Limpa, deduplica e recorta as ocorrências |
| `data/pipeline/05_risk_model.py` | Risco por trecho e faixa de tempo |
| `data/pipeline/07_load_db.py` | Carrega o banco e cria a credencial do servidor |

Os parâmetros ficam em `data/config/`.

## Banco de dados

O esquema está em `supabase/migrations/`. Toda mudança é uma nova migração numerada; migração aplicada não é editada. O banco é fechado ao público: RLS ligado em todas as tabelas e nenhuma política.

## Dados

Os dados brutos não ficam no repositório. Veja [`data/README.md`](data/README.md).

## Configuração

Copie `.env.example` para `.env.local` e preencha. Nenhum segredo vai para o Git nem para o navegador.

## Licenças

- Código: [MIT](LICENSE).
- Mapa e grafo de ruas: © colaboradores do OpenStreetMap, licença ODbL.
- Ocorrências: SSP-SP (dados públicos).
