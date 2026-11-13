# Dados do SafeRoute

Os dados brutos **não ficam neste repositório** (são grandes e o `.gitignore` os bloqueia). Aqui ficam só os scripts do pipeline (`pipeline/`) e os parâmetros do modelo (`config/`).

## Onde o pipeline procura os dados

O pipeline lê o caminho da pasta de dados da variável de ambiente `SAFEROUTE_DATA_DIR` (veja `.env.example`). Nenhum caminho fica fixo no código.

## Como obter os dados brutos

| Dado | Fonte | Uso |
|---|---|---|
| SP Dados (microdados de todas as naturezas), 2024 e 2025 | SSP-SP, página de Bases de Dados (arquivos .xlsx por ano) | Ocorrências de roubo e furto |
| Limite dos distritos (Censo 2022) | IBGE, malha de distritos com atributos (.gpkg) | Polígono da área do piloto |
| Ruas | OpenStreetMap, baixado pelo próprio pipeline com OSMnx | Nós e arestas do grafo |

O passo a passo de cada script entra junto com o pipeline, a partir do M1.

## O que nunca entra no banco nem no repositório

Qualquer coluna dos boletins com dado de pessoa: vítima, autor, placa, IMEI ou documento. O banco guarda só tipo, data, hora ou período, tipo de local e ponto.

## Licenças e atribuição

- OpenStreetMap: © colaboradores do OpenStreetMap, licença ODbL.
- SSP-SP: dados públicos; citar a fonte.
