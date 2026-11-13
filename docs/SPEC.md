# SafeRoute — Especificação do App v0 (demo do piloto)

> **Data:** 2026-11-12 · **Destino no repositório:** `docs/SPEC.md`
> **O que é:** especificação completa da primeira versão do app, para ser executada com Claude Code por uma pessoa sem time de desenvolvimento dedicado.
> **Como ler os status:** `[DECIDIDO]` = definido pelo responsável pelo projeto · `[ASSUMIDO]` = escolha do arquiteto, vale até ser contestada · `[HIPÓTESE]` = número ou regra a calibrar com dado · `[VERIFICAR]` = fato externo a confirmar antes de depender dele.

---

## 0. Decisões desta versão

| # | Decisão | Status | Justificativa |
|---|---|---|---|
| D1 | Região de demonstração: distrito do Tatuapé + faixa de 500 m | [DECIDIDO] como região-exemplo | 30º DP: 5.726 → 6.713 roubos e furtos (2024 → 2025), +17,2% |
| D2 | Escopo de risco: só crime patrimonial (roubo e furto) | [DECIDIDO] | Acidentes, enchentes e assédio ficam fora |
| D3 | Dois modos: a pé e carro | [DECIDIDO] | A pé entra primeiro (M3), carro logo depois (M5) |
| D4 | Código aberto | [DECIDIDO] | Licença MIT para o código [ASSUMIDO, confirmar] |
| D5 | App web responsivo instalável (PWA), não app de loja | [ASSUMIDO] | Sem conta de loja, sem revisão da Apple/Google, vira link para o formulário e para o pitch. React Native fica para depois da validação |
| D6 | Backend = Supabase (PostGIS + pgRouting) + Next.js na Vercel | [ASSUMIDO] | Nenhum servidor para operar. pgRouting 3.4.1 e PostGIS 3.3.7 confirmados como disponíveis no Supabase em 12/11/2026. Troca GraphHopper/Valhalla (Fundação Técnica) por algo que uma pessoa mantém |
| D7 | Risco calculado por segmento de rua (aresta), não por célula H3 | [ASSUMIDO] | Extensão H3 não está disponível no Supabase; o grafo do piloto é pequeno; cumpre a promessa "por trecho" |
| D8 | Tempo em 8 faixas: 4 períodos do dia × (dia útil / fim de semana) | [ASSUMIDO] | Só 62,3% dos registros têm hora exata; 99% têm ao menos o período |
| D9 | Sem login, sem guardar rotas de ninguém | [ASSUMIDO] | Privacidade por padrão; reduz a superfície de LGPD a quase zero na v0 |
| D10 | O app nunca diz "rota segura" | [ASSUMIDO] | Diz "menor risco registrado". Evita promessa que não se pode cumprir |
| D11 | Banco fechado ao público; só o servidor Next.js acessa | [ASSUMIDO] | Modelo de segurança mais simples de acertar |

Se alguma linha [ASSUMIDO] não servir, mude aqui antes de programar e registre em `docs/DECISIONS.md`.

---

## 1. Objetivo e critério de sucesso

**Objetivo:** uma pessoa abre um link no celular, escolhe origem e destino dentro do Tatuapé, e vê até três rotas com o custo em tempo e o ganho em exposição a risco, calculados com dado oficial da SSP-SP.

**A v0 está pronta quando:**

1. O link público funciona em celular Android e iPhone, sem instalar nada.
2. Para origem e destino dentro da área, o app devolve as rotas em menos de 3 s (p95).
3. Cada rota mostra tempo, distância e variação de exposição em relação à mais rápida.
4. Tocar em um trecho explica o porquê do risco (quantas ocorrências, de que tipo, em que período).
5. A tela "Sobre os dados" declara fonte, período, limitações e licenças.
6. O relatório de validação existe e traz dois números: PAI do modelo e o trade-off médio tempo × exposição em 200 pares de teste.
7. Repositório público com README que permite a outra pessoa reproduzir o piloto.

**Metas de qualidade [HIPÓTESE], vindas do deck de viabilidade de 03/11:**
- PAI ≥ 3 nos 5% de trechos de maior risco (treino 2024, teste 2025).
- Rota de menor risco com −30% de exposição e até +10% de tempo, na mediana.

Se as metas não forem atingidas, a v0 ainda é entregue, e o relatório diz o número real.

---

## 2. Escopo

### P0 — entra na v0

| ID | Funcionalidade | Critério de conclusão |
|---|---|---|
| F1 | Mapa do piloto com limite da área visível | Mapa carrega centrado no Tatuapé; fora da área fica esmaecido |
| F2 | Definir origem e destino: toque no mapa, busca por endereço, "minha localização" | As três formas funcionam; pontos fora da área geram aviso |
| F3 | Modo a pé e modo carro | Trocar o modo recalcula; carro respeita mão de direção |
| F4 | Horário: "agora" ou escolha de período + dia útil/fim de semana | Trocar o horário muda o risco e pode mudar a rota |
| F5 | Até 3 rotas: Mais rápida, Equilibrada, Menor risco | Cartões com tempo, distância e exposição relativa; rotas iguais são fundidas |
| F6 | Rota desenhada com cor por nível de risco do trecho | 4 níveis de cor com legenda; não depender só de cor (espessura/padrão) |
| F7 | "Por que este trecho?" | Toque no trecho abre ocorrências registradas por tipo, período e confiança |
| F8 | Camada de risco ligável | Mostra todos os trechos da área coloridos para o modo e horário atuais |
| F9 | Tela "Sobre os dados e limitações" + aviso na primeira abertura | Texto do item 11.3 presente; aviso precisa ser aceito uma vez |
| F10 | Estados de erro e vazio | Fora da área, sem rota, sem conexão, localização negada, servidor lento |
| F11 | PWA instalável | Manifesto e ícones; "Adicionar à tela inicial" funciona |

### P1 — logo depois da v0
- Iluminação pública como fator noturno (depende de baixar a camada do GeoSampa; a pasta `01 - Dados Brutos/Infraestrutura` está vazia hoje).
- Normalização por exposição ("roubo por transeunte") usando fluxo da Pesquisa OD. A régua decidida é volume + roubo por transeunte; a v0 usa só volume e declara isso.
- Botão de feedback anônimo sobre a rota ("faria este caminho?").
- Geocodificar os 16,8% de registros sem coordenada.
- Compartilhar rota por link.

### P2 — depois de validar com usuários
- Navegação passo a passo com voz e recálculo.
- Relatos da comunidade com confirmação social e proteção contra fraude.
- Segundo distrito e, depois, a cidade inteira.
- API pública documentada para parceiros (o endpoint interno já tem esse formato).

### P3 — expansão
- App nativo, contas e perfis, multi-organização (B2B), painéis para prefeitura (B2G), modelo de ML ou GNN.

### Não construir agora
Login, cadastro, perfil, notificações push, anúncios, assinatura, painel administrativo, relatos de usuários, histórico de rotas, navegação por voz. Nenhum desses itens é necessário para provar a tese, e todos aumentam custo, risco jurídico e prazo.

---

## 3. Arquitetura

```
┌──────────────────────────── CELULAR / NAVEGADOR ───────────────────────────┐
│  PWA Next.js (React + TypeScript)                                          │
│  MapLibre GL JS ── mapa-base vetorial (OpenFreeMap) [VERIFICAR]            │
│  Busca de endereço ── Photon (komoot) limitado à área [VERIFICAR termos]   │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ HTTPS (JSON)
┌───────────────▼────────────── VERCEL ──────────────────────────────────────┐
│  Next.js Route Handlers (servidor)                                         │
│   GET /api/routes   valida entrada, limita taxa, chama o banco             │
│   GET /api/risk     camada de risco em GeoJSON (cache longo)               │
│   GET /api/explain  detalhes de um trecho                                  │
│   GET /api/meta     área do piloto, versão do modelo, datas dos dados      │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ chave secreta do Supabase (só no servidor)
┌───────────────▼────────────── SUPABASE (Postgres) ─────────────────────────┐
│  PostGIS + pgRouting                                                       │
│  Tabelas: pilot_area, nodes, edges, crime_events, risk_runs, edge_risk,    │
│           routing_profiles, app_config                                     │
│  Funções SQL: get_routes(), get_risk_layer(), explain_edge()               │
│  RLS ligado em tudo, sem políticas públicas (acesso só pelo servidor)      │
└───────────────▲────────────────────────────────────────────────────────────┘
                │ carga em lote (roda no computador com os dados)
┌───────────────┴────────────── PIPELINE DE DADOS (Python) ──────────────────┐
│  1 grafo OSM (OSMnx) → nodes/edges                                         │
│  2 SSP-SP (parquet) → limpeza, deduplicação, recorte → crime_events        │
│  3 modelo de risco v0 → edge_risk                                          │
│  4 validação (PAI, trade-off) → docs/VALIDATION.md                         │
└────────────────────────────────────────────────────────────────────────────┘
```

**Por que assim:** o que muda a cada pedido (calcular rota) fica no banco, onde os dados já estão. O que muda raramente (grafo, risco) é pré-calculado em lote. Não existe servidor próprio para manter ligado.

**Custo:** Supabase e Vercel têm plano gratuito. Limites e preços devem ser conferidos nos painéis; não há valor cotado neste documento.

**Contas próprias do projeto [DECIDIDO em 12/11]:** o SafeRoute não compartilha organização, projeto nem cobrança com outros projetos. Os membros podem entrar com as contas pessoais que já têm (inclusive login pelo GitHub); o que precisa ser do SafeRoute é a organização ou time em cada ferramenta, com pelo menos dois membros como donos, para o projeto não depender de uma pessoa e poder ser transferido à empresa quando houver CNPJ. Login pessoal exige verificação em duas etapas ligada, principalmente no GitHub, que passa a dar acesso a todas as outras contas.
- **Supabase:** o plano gratuito permite 2 projetos ativos somando todas as organizações em que a pessoa é Owner ou Administrator. O projeto fica em uma organização própria do SafeRoute.
- **Supabase gratuito pausa projetos após 7 dias sem uso.** O link da demo pode estar fora do ar no dia da avaliação. Antes de cada apresentação, abrir o app; se a pausa virar problema, avaliar o plano Pro.
- **Vercel:** o plano Hobby é para uso pessoal e não comercial, e colaboração em time costuma exigir plano pago [VERIFICAR termos atuais]. Para a demo: projeto na conta Hobby do responsável, importando o repositório público da organização SafeRoute no GitHub [VERIFICAR se o Hobby importa repositório de organização]. Ao virar empresa, migrar para um time pago.
- **GitHub:** organização própria do SafeRoute, com os três membros.

**Portabilidade (sem ficar preso a fornecedor):** o banco usa só Postgres, PostGIS e pgRouting; o app não usa Auth, Storage, Edge Functions nem o cliente do Supabase. Trocar de provedor é exportar o banco e mudar a string de conexão. O Next.js roda igual em contêiner Docker, então sair da Vercel para um servidor próprio também é viável. Não usar recursos exclusivos de fornecedor no código (ex.: armazenamento chave-valor da Vercel); configurações de painel, como o firewall, são aceitáveis porque não prendem o código. Antes de qualquer migração, conferir se o provedor novo oferece pgRouting [VERIFICAR].

---

## 4. Stack

| Camada | Escolha | Por quê | Alternativa descartada |
|---|---|---|---|
| Interface | Next.js (App Router) + TypeScript, versão estável atual | Um projeto só para tela e servidor; publicação automática na Vercel | React Native: exige lojas e duplica trabalho antes da validação |
| Mapa | MapLibre GL JS | Aberto, sem licença, aceita camadas próprias | Google Maps SDK: custo e termos restritivos |
| Mapa-base | OpenFreeMap [VERIFICAR disponibilidade e termos] | Sem chave e sem custo | MapTiler (precisa de chave) como reserva |
| Busca de endereço | Photon [VERIFICAR termos de uso] | Autocompletar sem chave, baseado em OSM | Nominatim público proíbe autocompletar |
| Banco | Supabase Postgres + PostGIS + pgRouting | Geoespacial e roteamento no mesmo lugar | GraphHopper/Valhalla: servidor Java/C++ para operar |
| Pipeline | Python 3.11+, OSMnx, GeoPandas, pandas, SQLAlchemy/psycopg | Os scripts existentes já são Python | — |
| Testes | pytest (dados), Vitest (interface), Playwright (fluxo completo) | Padrões de mercado | — |
| Integração contínua | GitHub Actions | Roda testes e lint a cada envio | — |

Regra para o Claude Code: usar a versão estável atual de cada biblioteca e conferir a documentação oficial antes de usar uma API; não confiar em versão lembrada de memória.

---

## 5. Dados

### 5.1 Fontes e onde estão

Pasta local: a indicada pela variável de ambiente `SAFEROUTE_DATA_DIR`

| Dado | Local | Uso na v0 |
|---|---|---|
| SP Dados (microdados de todas as naturezas), 2024 e 2025 | `01 - Dados Brutos\SSP-SP\SP Dados - microdados todas as naturezas\` (xlsx; há conversor `06 - Scripts\xlsx_para_parquet.py`) | Fonte principal de crime |
| Celulares, objetos e veículos subtraídos | `01 - Dados Brutos\SSP-SP\...` | Reserva para detalhar tipos (P1) |
| Limite do distrito | `01 - Dados Brutos\Censo IBGE\SP_distritos_CD2022.gpkg` | Polígono do Tatuapé |
| Grafo de ruas | Baixado do OpenStreetMap pelo OSMnx | nodes e edges |
| Iluminação (GeoSampa) | Ainda não baixada | P1 |

Os dados brutos **não entram no repositório** (tamanho e boa prática). O repositório guarda os scripts e um `data/README.md` dizendo como obtê-los.

### 5.2 Colunas reais da SSP (confirmadas no script `analise_ssp.py`)

`NOME_DELEGACIA`, `ANO_BO`, `NUM_BO`, `NATUREZA_APURADA`, `LATITUDE`, `LONGITUDE`, `DATA_OCORRENCIA_BO`, `HORA_OCORRENCIA_BO`, `DESCR_TIPOLOCAL`, e colunas que começam com `NOME_MUNICIPIO_CIRC` e `NOME_DELEGACIA_CIRC`. Latitude e longitude vêm com vírgula decimal. O nome da coluna de período do dia deve ser confirmado na etapa de perfilamento [VERIFICAR].

Naturezas de roubo e furto na capital em 2025: FURTO - OUTROS (250.064), ROUBO - OUTROS (96.638), FURTO DE VEÍCULO (38.650), ROUBO DE VEÍCULO (9.921), ROUBO DE CARGA (1.720), FURTO DE CARGA (104).

### 5.3 Pipeline (`data/pipeline/`)

| Passo | Script | Faz | Saída |
|---|---|---|---|
| 1 | `01_pilot_area.py` | Lê o polígono do Tatuapé, aplica faixa de 500 m, grava | `pilot_area` |
| 2 | `02_build_graph.py` | OSMnx: grafo `walk` e grafo `drive` da área; calcula `length_m` e `time_s` | `nodes`, `edges` |
| 3 | `03_profile_ssp.py` | Lista colunas, valores distintos de natureza, tipo de local e período; % com coordenada e hora | `docs/DATA_PROFILE.md` |
| 4 | `04_load_crimes.py` | Limpa, deduplica, recorta para a área + 100 m, classifica, grava | `crime_events` |
| 5 | `05_risk_model.py` | Calcula o risco por trecho e faixa de tempo | `risk_runs`, `edge_risk` |
| 6 | `06_validate.py` | PAI com corte temporal e curva tempo × exposição | `docs/VALIDATION.md` |

**Regras de limpeza (passo 4):**
- Filtrar município `S.PAULO`; manter só naturezas com ROUBO ou FURTO, excluindo TENTATIVA e LATROCÍNIO (mesma regra da análise de 03/11).
- Deduplicar por (`NOME_DELEGACIA`, `ANO_BO`, `NUM_BO`, `NATUREZA_APURADA`).
- Coordenada válida = dentro da caixa do município (lat −24,05 a −23,35; lon −46,85 a −46,35). Sem coordenada válida: descartar na v0 e contar no relatório.
- Marcar como suspeito ponto repetido 100+ vezes (possível centroide) e reduzir seu peso à metade [HIPÓTESE].
- **Descartar toda coluna com dado de pessoa** (vítima, autor, placa, IMEI, documento). O banco guarda só: tipo, data, hora/período, tipo de local e ponto.
- Categorias: `roubo_pessoa` (ROUBO - OUTROS), `furto_pessoa` (FURTO - OUTROS), `roubo_veiculo`, `furto_veiculo`, `carga`. O mapeamento fica em `data/config/categories.yaml` para revisão humana.
- Manter só ocorrências em via pública para o modo a pé (`DESCR_TIPOLOCAL` contendo "Via P"); a regra para carro é definida após o perfilamento.

**Velocidades para `time_s` [HIPÓTESE]:** a pé 4,8 km/h; carro pelo limite da via no OSM quando existir, senão por tipo de via (tabela em `data/config/speeds.yaml`). O tempo de carro não considera trânsito; a interface diz isso.

---

## 6. Modelo de dados

Arquivo: `supabase/migrations/0001_init.sql`. Toda mudança de esquema é uma nova migração numerada; nunca editar migração já aplicada.

```sql
create extension if not exists postgis;
create extension if not exists pgrouting;

-- Área do piloto (uma linha)
create table pilot_area (
  id        smallint primary key default 1 check (id = 1),
  name      text not null,
  buffer_m  integer not null,
  geom      geometry(MultiPolygon, 4326) not null
);

-- Nós do grafo (cruzamentos)
create table nodes (
  id    bigint primary key,                       -- id do nó no OSM
  geom  geometry(Point, 4326) not null
);
create index nodes_geom_idx on nodes using gist (geom);

-- Arestas dirigidas (um registro por sentido permitido)
create table edges (
  id          bigserial primary key,
  mode        text not null check (mode in ('walk','drive')),
  source      bigint not null references nodes(id),
  target      bigint not null references nodes(id),
  osm_way_id  bigint,
  name        text,
  highway     text,
  length_m    real not null check (length_m > 0),
  time_s      real not null check (time_s > 0),
  geom        geometry(LineString, 4326) not null
);
create index edges_geom_idx   on edges using gist (geom);
create index edges_mode_idx   on edges (mode);
create index edges_source_idx on edges (mode, source);
create index edges_target_idx on edges (mode, target);

-- Ocorrências (sem nenhum dado pessoal)
create table crime_events (
  id            bigserial primary key,
  bo_key        text not null unique,             -- hash de delegacia|ano|numero|natureza
  category      text not null check (category in
                  ('roubo_pessoa','furto_pessoa','roubo_veiculo','furto_veiculo','carga')),
  occurred_on   date not null,
  hour          smallint check (hour between 0 and 23),
  period        smallint check (period between 0 and 3), -- 0 madrugada, 1 manhã, 2 tarde, 3 noite
  is_weekend    boolean not null,
  public_way    boolean not null,
  suspect_point boolean not null default false,
  geom          geometry(Point, 4326) not null
);
create index crime_geom_idx on crime_events using gist (geom);
create index crime_date_idx on crime_events (occurred_on);

-- Cada execução do modelo de risco
create table risk_runs (
  id          serial primary key,
  created_at  timestamptz not null default now(),
  params      jsonb not null,                     -- raio, pesos, anos usados
  metrics     jsonb,                              -- PAI, cobertura, descartes
  data_from   date not null,
  data_to     date not null
);

-- Risco por aresta e faixa de tempo
create table edge_risk (
  run_id      integer  not null references risk_runs(id) on delete cascade,
  edge_id     bigint   not null references edges(id) on delete cascade,
  bucket      smallint not null check (bucket between 0 and 7), -- period*2 + weekend
  n_events    integer  not null,                  -- contagem bruta no raio
  density     real     not null,                  -- peso por metro
  score       real     not null check (score between 0 and 1),
  confidence  real     not null check (confidence between 0 and 1),
  components  jsonb    not null,                  -- contagem por categoria, para explicar
  primary key (run_id, edge_id, bucket)
);
create index edge_risk_lookup_idx on edge_risk (run_id, bucket, edge_id);

-- Perfis de rota
create table routing_profiles (
  key    text primary key,                        -- 'fast','balanced','safer'
  label  text not null,
  beta   real not null check (beta >= 0),
  sort   smallint not null
);
insert into routing_profiles values
  ('fast','Mais rápida',0,1), ('balanced','Equilibrada',2,2), ('safer','Menor risco',6,3);

-- Configuração ativa
create table app_config (
  id             smallint primary key default 1 check (id = 1),
  active_run_id  integer references risk_runs(id)
);

-- Segurança: tudo fechado; só a chave de servidor acessa
alter table pilot_area       enable row level security;
alter table nodes            enable row level security;
alter table edges            enable row level security;
alter table crime_events     enable row level security;
alter table risk_runs        enable row level security;
alter table edge_risk        enable row level security;
alter table routing_profiles enable row level security;
alter table app_config       enable row level security;
```

**Relacionamentos:** `edges.source/target → nodes` · `edge_risk.edge_id → edges` · `edge_risk.run_id → risk_runs` · `app_config.active_run_id → risk_runs`.

**Backup e versão:** o banco é 100% reconstruível pelo pipeline a partir dos dados brutos; esse é o backup da v0. Cada `risk_run` guarda parâmetros e métricas, então trocar de modelo é mudar `active_run_id`, e voltar atrás é mudar de novo.

Os valores de `beta` (0, 2, 6) são [HIPÓTESE]; o passo 6 do pipeline calibra.

---

## 7. Modelo de risco v0 (estatístico e explicável)

Para cada aresta `e` de um modo e cada faixa de tempo `b`:

```
peso(e,b) = Σ sobre ocorrências i relevantes ao modo, a até R metros de e:
              k(d_i) · s(categoria_i) · r(ano_i) · t(i,b) · c(i)

k(d)  = 1 − d/R                      proximidade (R = 60 m)
s     = 1,0 roubo · 0,5 furto        gravidade
r     = 1,0 ano mais recente · 0,5 ano anterior
t     = 1 se a ocorrência é da faixa b; 1/4 em cada período se só a data é conhecida
c     = 0,5 se ponto suspeito de centroide; senão 1

densidade(e,b) = peso(e,b) / max(length_m, 30)
score(e,b)     = posição percentual da densidade entre todas as arestas e faixas do modo (0 a 1); 0 se peso = 0
confiança(e,b) = min(1, n_events / 5)
```

- **Categorias por modo:** a pé = `roubo_pessoa`, `furto_pessoa` em via pública. Carro = `roubo_veiculo`, `furto_veiculo`, mais `roubo_pessoa` em via pública com peso 0,5.
- **Ranking global por modo** (não por faixa): assim a noite aparece mais arriscada que a manhã quando de fato é.
- Todos os parâmetros (R, pesos, anos) ficam em `data/config/risk.yaml`, entram em `risk_runs.params` e são [HIPÓTESE].
- `components` guarda a contagem por categoria; é o que a tela "Por que este trecho?" mostra.

**Limitações que o app declara:** reflete crime registrado, não crime ocorrido; cerca de 17% dos registros não têm coordenada e ficam de fora; mais registro não é igual a mais perigo por pessoa (falta normalizar por fluxo, P1).

**Validação (passo 6):**
1. **PAI:** treina com 2024, marca os 5% de arestas de maior score, mede que fração dos crimes de 2025 caiu nelas. PAI = % de crimes capturados ÷ % de extensão marcada.
2. **Trade-off:** 200 pares origem–destino aleatórios na área, por modo e faixa; para cada `beta`, mediana de variação de tempo e de exposição contra a rota mais rápida. A tabela resultante define os `beta` finais.

---

## 8. Roteamento

**Custo de uma aresta:** `custo = time_s × (1 + beta × score)`.
Com `beta = 0` é a rota mais rápida. Com `beta = 6`, um trecho de score 1 custa como se levasse 7 vezes mais tempo.

**Exposição de uma rota:** `Σ score × length_m` das arestas. A interface mostra a variação percentual contra a rota mais rápida, nunca o número bruto.

Função de referência (`supabase/migrations/0002_functions.sql`). É um esboço: o Claude Code deve testar, conferir em qual schema o Supabase instala o pgRouting e ajustar o `search_path`.

```sql
create or replace function get_routes(
  o_lng double precision, o_lat double precision,
  d_lng double precision, d_lat double precision,
  p_mode text, p_bucket smallint
) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
set statement_timeout = '5s'
as $$
declare
  v_o   geometry := st_setsrid(st_makepoint(o_lng, o_lat), 4326);
  v_d   geometry := st_setsrid(st_makepoint(d_lng, d_lat), 4326);
  v_run integer  := (select active_run_id from app_config where id = 1);
  v_src bigint;  v_dst bigint;
  v_sql text;    v_route jsonb;  v_out jsonb := '[]'::jsonb;
  p     record;
begin
  if p_mode not in ('walk','drive') or p_bucket not between 0 and 7 then
    return jsonb_build_object('error', 'invalid_params');
  end if;
  if not exists (select 1 from pilot_area a
                 where st_covers(a.geom, v_o) and st_covers(a.geom, v_d)) then
    return jsonb_build_object('error', 'out_of_area');
  end if;

  select e.source into v_src from edges e where e.mode = p_mode
   order by e.geom <-> v_o limit 1;
  select e.target into v_dst from edges e where e.mode = p_mode
   order by e.geom <-> v_d limit 1;

  for p in select key, label, beta from routing_profiles order by sort loop
    v_sql := format(
      'select e.id, e.source, e.target,
              (e.time_s * (1 + %s * coalesce(r.score, 0)))::float8 as cost
         from edges e
         left join edge_risk r
           on r.edge_id = e.id and r.run_id = %s and r.bucket = %s
        where e.mode = %L',
      p.beta, v_run, p_bucket, p_mode);

    select jsonb_build_object(
             'profile',  p.key,
             'label',    p.label,
             'time_s',   round(sum(e.time_s)),
             'length_m', round(sum(e.length_m)),
             'exposure', sum(coalesce(r.score, 0) * e.length_m),
             'segments', jsonb_agg(jsonb_build_object(
                           'edge_id', e.id,
                           'score',   coalesce(r.score, 0),
                           'geometry', st_asgeojson(e.geom, 6)::jsonb)
                         order by d.seq))
      into v_route
      from pgr_dijkstra(v_sql, v_src, v_dst, true) d
      join edges e on e.id = d.edge
      left join edge_risk r
        on r.edge_id = e.id and r.run_id = v_run and r.bucket = p_bucket;

    if v_route is not null and v_route->>'time_s' is not null then
      v_out := v_out || v_route;
    end if;
  end loop;

  if jsonb_array_length(v_out) = 0 then
    return jsonb_build_object('error', 'no_route');
  end if;
  return jsonb_build_object('routes', v_out, 'run_id', v_run);
end $$;

revoke all on function get_routes from public, anon, authenticated;

-- Papel exclusivo do servidor do app (senha definida fora do Git)
-- create role app_api login password '...';
-- grant usage on schema public to app_api;
-- grant execute on function get_routes, get_risk_layer, explain_edge to app_api;
-- Nenhum grant em tabela para app_api.
```

**Sobre o SQL montado dentro da função:** o `pgr_dijkstra` recebe a consulta das arestas como texto. Todo valor que entra nesse texto é do tipo número (validado na assinatura da função) ou passa por `%L`, que coloca aspas com escape. Nunca concatenar texto vindo do usuário. A mesma regra vale para qualquer função nova.

**Desempenho:** a consulta das arestas deve ser recortada por uma caixa em volta de origem e destino com margem (por exemplo, 1,5 km), em vez de carregar o grafo inteiro do modo a cada pedido. Na área do piloto a diferença é pequena; ao expandir para a cidade, é o que mantém o tempo de resposta.

**Simplificação conhecida:** a origem "gruda" no nó inicial da aresta mais próxima, não no ponto exato. Aceitável na v0; melhorar em P1.

Funções irmãs: `get_risk_layer(p_mode, p_bucket)` devolve as arestas com score > 0 em GeoJSON; `explain_edge(p_edge_id, p_bucket)` devolve `components`, `n_events`, `confidence`, nome da rua e período dos dados.

---

## 9. API (Route Handlers do Next.js)

| Rota | Parâmetros | Resposta | Regras |
|---|---|---|---|
| `GET /api/meta` | — | área do piloto (GeoJSON), versão do modelo, período dos dados, perfis | Cache de 1 h |
| `GET /api/routes` | `o=lng,lat` `d=lng,lat` `mode=walk\|drive` `bucket=0..7` | `{routes:[{profile,label,time_s,length_m,exposure_delta_pct,time_delta_pct,segments[]}]}` | Valida tudo com esquema (Zod); funde rotas idênticas; calcula os deltas contra `fast` |
| `GET /api/risk` | `mode` `bucket` | FeatureCollection de arestas com `score` e `level` (1 a 4) | Cache de 24 h; 16 combinações possíveis |
| `GET /api/explain` | `edge` `bucket` | `{street, n_events, by_category, confidence, data_from, data_to}` | — |

**Erros (JSON `{error, message}`):** `invalid_params` 400 · `out_of_area` 422 · `no_route` 404 · `rate_limited` 429 · `upstream_timeout` 504.

**Regras do servidor:**
- **O servidor não usa a chave `service_role` do Supabase nem o cliente `supabase-js`.** Conecta por string de conexão Postgres com um papel próprio, `app_api`, que só pode executar as três funções (`get_routes`, `get_risk_layer`, `explain_edge`) e não tem permissão de ler nenhuma tabela. Se a credencial vazar, o estrago se limita ao que o app já mostra publicamente. A string fica só em variável de ambiente de servidor, nunca com prefixo `NEXT_PUBLIC_`.
- A conexão passa pelo pooler do Supabase em modo transação, adequado para funções serverless [VERIFICAR na documentação: porta, e desligar prepared statements no driver se o pooler exigir].
- **Limite de taxa fora da memória do servidor.** Na Vercel cada pedido pode cair em uma instância diferente, então um contador em memória não protege. Usar a regra de limite de taxa do firewall da Vercel em `/api/*` (por exemplo, 30 pedidos por minuto por IP) [HIPÓTESE no número; VERIFICAR disponibilidade no plano]. Se o plano não oferecer, usar um contador externo (Redis gerenciado) antes de divulgar o link.
- **Erros genéricos para fora, detalhe só no log.** A resposta nunca traz mensagem do Postgres, nome de tabela, caminho de arquivo ou pilha de chamadas; só o código e a mensagem da tabela de erros acima.
- O servidor **não registra** origem, destino nem IP junto com rota. Log só de contagem, status e latência.
- Níveis de cor: `level` 1 (score 0 a 0,5), 2 (0,5 a 0,8), 3 (0,8 a 0,95), 4 (acima de 0,95) [HIPÓTESE].

---

## 10. Interface

### 10.1 Telas

1. **Primeira abertura:** nome, frase "Tudo começa pelo caminho.", três linhas sobre o que o app faz e o que ele não garante, botão "Entendi".
2. **Mapa (tela principal):** mapa em tela cheia; painel inferior com Origem, Destino, seletor A pé/Carro, seletor de horário ("Agora" ou período + dia útil/fim de semana); botões de localização, camada de risco e "Sobre".
3. **Resultado:** painel inferior com até três cartões. Cada cartão: nome do perfil, tempo, distância, e a comparação ("+3 min · −28% de exposição"). O cartão selecionado destaca sua rota; as outras ficam finas e cinza.
4. **Por que este trecho?:** folha com nome da rua, "N ocorrências registradas neste período em 2024–2025", divisão por tipo, e selo de confiança (baixa, média, alta).
5. **Sobre os dados:** fonte, período, método em linguagem simples, limitações, licenças, link do repositório.

### 10.2 Fluxo principal

Abrir → (aviso, só na primeira vez) → tocar no mapa ou buscar a origem → definir o destino → rotas aparecem → tocar em um cartão → tocar em um trecho para ver o porquê → mudar horário ou modo e ver a rota mudar.

### 10.3 Estados

| Situação | Comportamento |
|---|---|
| Ponto fora da área | "Por enquanto o SafeRoute cobre só o Tatuapé." e o limite pisca no mapa |
| Rotas todas iguais | Um cartão só: "A rota mais rápida já é a de menor risco registrado." |
| Sem rota | "Não encontramos caminho entre esses pontos para este modo." |
| Localização negada | Continua funcionando por toque e busca; sem insistir |
| Sem conexão ou servidor lento | Mensagem clara e botão "Tentar de novo"; nunca tela em branco |
| Busca de endereço fora do ar | O toque no mapa continua funcionando |
| Trecho com confiança baixa | Texto "poucos registros; leia com cautela" |

### 10.4 Diretrizes de design

- Pensado primeiro para celular com uma mão; alvos de toque de 44 px ou mais.
- Tom calmo e informativo. Sem vermelho gritante, sem caveira, sem palavra "perigoso". Escala de risco em âmbar → vinho, com espessura variando junto (não depender só de cor).
- Contraste AA, textos em português claro, suporte a leitor de tela nos cartões.
- Tema claro e escuro (o uso noturno é o caso principal).
- Atribuição visível: "© OpenStreetMap" e "Dados: SSP-SP".
- O Claude Code deve usar a skill `frontend-design` ao construir as telas.

### 10.5 Publicação (entra no M6)

- **robots.txt** (gerado por `app/robots.ts`): libera as páginas e bloqueia `/api/`, para robôs não consumirem a cota do banco nem o limite de taxa.
- **Metadados de compartilhamento:** título, descrição e imagem de prévia (Open Graph) em todas as páginas, para o link aparecer bem no WhatsApp, LinkedIn e no formulário. Descrição sugerida: "Compare rotas a pé e de carro pelo risco registrado de roubo e furto. Piloto no Tatuapé, São Paulo, com dados públicos da SSP-SP."
- **Velocidade:** relatório Lighthouse em modo celular, meta de 90 ou mais em Desempenho, Acessibilidade e Boas práticas [HIPÓTESE]; mapas pesam, então a nota de Desempenho pode exigir carregamento tardio do mapa.
- **Métricas de uso:** sem Google Analytics nem qualquer rastreador com cookie (item 11.1). Se precisar contar visitas, usar uma opção sem cookies, como o Vercel Web Analytics [VERIFICAR se o plano e os termos atendem], e só contagem agregada de páginas.
- **Domínio próprio:** aponta para a Vercel quando existir (item 14). Até lá, o subdomínio da Vercel serve.

Ficam para quando existir página de apresentação do produto (fora da v0): Google Search Console, sitemap.xml, llms.txt e palavras-chave.

### 10.6 Estrutura do código

```
app/
  page.tsx                 tela do mapa
  sobre/page.tsx           sobre os dados
  api/{meta,routes,risk,explain}/route.ts
components/
  MapView.tsx  RoutePanel.tsx  RouteCard.tsx  PlaceInput.tsx
  ModeToggle.tsx  TimePicker.tsx  SegmentSheet.tsx  Onboarding.tsx
lib/
  api.ts  bucket.ts  geo.ts  schema.ts  supabase-server.ts
```

`lib/bucket.ts` converte data e hora em faixa: madrugada 0h–6h, manhã 6h–12h, tarde 12h–18h, noite 18h–24h [confirmar com os períodos da SSP no perfilamento]; fim de semana = sábado e domingo.

---

## 11. Segurança, privacidade e conformidade

### 11.1 Dados pessoais
- A v0 não tem conta, não guarda rotas e não grava localização no servidor. A posição do usuário é usada no aparelho e enviada só como coordenada de origem do pedido, sem identificador.
- O banco não contém dado de pessoa dos BOs (regra do item 5.3).
- Sem ferramentas de rastreamento de terceiros. Se quiser métricas, usar contagem agregada sem cookies.
- Antes de qualquer recurso com conta, relato ou histórico (P1/P2), fazer análise de LGPD com apoio jurídico. Não presumir enquadramento.

### 11.2 Segurança técnica
- Segredos só em variáveis de ambiente; `.env*` no `.gitignore`; arquivo `.env.example` sem valores.
- RLS ligado em todas as tabelas, sem política pública. Não desligar o RLS para "fazer funcionar": se uma consulta voltar vazia, o problema é de permissão e se resolve com o papel e as funções do item 9.
- O papel `app_api` só executa funções; a chave `service_role` não é usada pelo app.
- Validação de toda entrada no servidor (Zod); limite de taxa no firewall; `statement_timeout` nas funções.
- Cabeçalhos de segurança no Next.js (CSP compatível com MapLibre e com os servidores de mapa).
- Nenhum uso de `dangerouslySetInnerHTML`; nomes de rua e textos vindos do OSM são exibidos como texto.
- Dependências verificadas na integração contínua.
- **Revisão de segurança ao fim de cada marco**, rodando o checklist abaixo.

**Checklist de segurança (M0, M3 e M6):**
1. Buscar `NEXT_PUBLIC_` no projeto inteiro e no build: só podem aparecer URLs e configurações sem valor secreto.
2. Abrir o app publicado, DevTools > Sources e Network: nenhuma credencial, nenhuma URL do banco.
3. Rodar os Security Advisor e Performance Advisor do Supabase e zerar os alertas ou justificar cada um em `docs/DECISIONS.md`.
4. Mandar parâmetros inválidos e maliciosos para cada rota da API (texto no lugar de número, `' OR 1=1 --`, coordenadas absurdas): todos devem voltar 400 com mensagem genérica.
5. Disparar pedidos em sequência contra `/api/routes` e confirmar que o limite de taxa responde 429.
6. Forçar um erro no servidor e confirmar que a resposta não mostra pilha nem mensagem do banco.

**Itens que não se aplicam à v0 (e quando passam a valer):** hash de senha com Argon2id, captcha e proteção contra força bruta entram junto com login ou com qualquer formulário (P1/P2). Controle de acesso por usuário (contra IDOR) entra quando houver dado de usuário. A v0 não usa modelo de linguagem, então não há superfície de injeção de prompt.

### 11.3 Linguagem do produto (texto obrigatório em "Sobre os dados")
- O SafeRoute mostra onde houve mais registros de roubo e furto. Ele não prevê crimes e não garante segurança em nenhum caminho.
- Os dados são boletins de ocorrência da SSP-SP de 2024 e 2025. Muitos crimes não são registrados, e parte dos registros não tem localização.
- O risco é calculado por trecho de rua e por período. O app não classifica bairros.
- Use como uma informação a mais. Em emergência, ligue 190.

Termos de uso e política de privacidade formais precisam de revisão jurídica antes de divulgação ampla [PENDENTE HUMANO].

### 11.4 Licenças
- Código: MIT [confirmar].
- Mapa e grafo: OpenStreetMap, licença ODbL, com atribuição. Base derivada do OSM tem obrigação de compartilhamento pela mesma licença quando distribuída; isso afeta um futuro produto B2B de dados fechados [VERIFICAR com apoio jurídico].
- SSP-SP: citar a fonte; condições de reuso comercial ainda não verificadas [VERIFICAR].

---

## 12. Testes

| Tipo | O que cobre | Ferramenta |
|---|---|---|
| Dados | Deduplicação, filtro de coordenada, classificação, cálculo de faixa, ausência de coluna pessoal | pytest com amostras pequenas |
| Banco | `get_routes` em grafo de brinquedo: `beta` alto desvia da aresta arriscada; mão única respeitada no carro; fora da área; sem rota | script SQL ou pytest contra Supabase local |
| Servidor | Validação de parâmetros, códigos de erro, fusão de rotas iguais, cálculo dos deltas | Vitest |
| Interface | Cartões, estados de erro, conversão de horário em faixa | Vitest + Testing Library |
| Fluxo completo | Abrir, marcar dois pontos, ver rotas, abrir explicação, trocar modo | Playwright em viewport de celular |
| Desempenho | p95 de `/api/routes` abaixo de 3 s com 50 pares | script simples |
| Acessibilidade | Contraste e rótulos | verificação automática + revisão manual |

**Definição de pronto de qualquer tarefa:** testes passando, lint limpo, documentação atualizada, e verificado no navegador em largura de celular.

---

## 13. Plano de construção (marcos)

Cada marco termina com uma demonstração e uma parada para revisão humana. O Claude Code não passa para o marco seguinte sem aprovação.

| Marco | Entrega | Critério de aprovação | Depende de |
|---|---|---|---|
| **M0 Fundação** | Repositório, estrutura de pastas, `CLAUDE.md`, lint, testes vazios rodando, integração contínua, projeto Supabase criado, migração 0001 aplicada, Next.js "olá" publicado na Vercel | Link da Vercel abre; `select postgis_version()` e `select pgr_version()` respondem | Contas (item 14) |
| **M1 Grafo** | Passos 1 e 2 do pipeline; contagem de nós e arestas por modo | Rota mais rápida entre dois pontos do Tatuapé sai por SQL | M0 |
| **M2 Crime e risco** | Passos 3, 4 e 5; `DATA_PROFILE.md` | `edge_risk` preenchida; mapa estático de conferência faz sentido para quem conhece o bairro | M1 |
| **M3 Rotas a pé** | Funções SQL, `/api/routes`, tela do mapa com três cartões | F1, F2, F4, F5, F6, F10 funcionando para o modo a pé | M2 |
| **M4 Explicação e transparência** | `/api/explain`, `/api/risk`, camada de risco, "Sobre os dados", primeira abertura | F7, F8, F9 | M3 |
| **M5 Carro e validação** | Modo carro; passo 6; `VALIDATION.md`; `beta` calibrado | F3 completo; PAI e curva de trade-off publicados | M4 |
| **M6 Acabamento** | PWA, tema escuro, acessibilidade, desempenho, publicação (item 10.5), README para terceiros, teste com 5 pessoas | Os 7 critérios do item 1 e o relatório Lighthouse | M5 |

Estimativa de esforço [HIPÓTESE, sem base histórica deste time]: M0 a M2 em uma semana de trabalho focado; M3 e M4 em outra; M5 e M6 em mais uma. Vale reestimar ao fim do M1.

---

## 14. O que só um humano pode fazer

**Antes do M0:**
- [ ] Ligar a verificação em duas etapas no GitHub, Supabase e Vercel.
- [ ] Criar a organização SafeRoute no GitHub (gratuita), com dois membros como donos, e o repositório público dentro dela.
- [ ] Criar a organização SafeRoute no Supabase (nova organização, separada de outros projetos), convidar o segundo dono, e criar o projeto na região São Paulo (item 3). Anotar o identificador do projeto no `CLAUDE.md`.
- [ ] Na Vercel, importar o repositório público e publicar.
- [ ] Antes de comprar domínio: pesquisar o nome "SafeRoute" na base de marcas do INPI e ver se o domínio está livre. Se o nome estiver ocupado, decidir o nome antes do domínio, do repositório público e do pitch.
- [ ] Comprar o domínio (registro .com.br pede CPF ou CNPJ do titular; registrar de forma que possa ser transferido à empresa depois) e apontar para a Vercel.
- [ ] Instalar no computador que tem os dados: Python 3.11+, Node.js LTS, Git, Claude Code.
- [ ] Confirmar a licença MIT com a equipe.

**Durante:**
- [ ] Aprovar cada marco.
- [ ] No M2, olhar o mapa de risco com alguém que conhece o Tatuapé e dizer se faz sentido.
- [ ] No M6, recrutar 5 pessoas para testar e anotar o que travou.
- [ ] Revisão jurídica dos termos e da política de privacidade antes de divulgar.

---

## 15. Como esta v0 prepara o que vem depois

| Futuro | O que já fica pronto |
|---|---|
| Outros distritos e cidades | `pilot_area` e o pipeline são parametrizados por polígono; nada no código cita "Tatuapé" fora da configuração |
| API para empresas (B2B) | `/api/routes` e `/api/risk` já têm formato de API; falta autenticação por chave, cotas e documentação pública |
| Prefeitura e segurança pública (B2G) | `get_risk_layer` é a base de um painel territorial |
| Modelo melhor (ML, GNN) | `risk_runs` versiona modelos; a interface e as rotas não mudam quando o score muda |
| Relatos da comunidade | Entram como mais um componente do score, com tabela própria; exigem conta ou identificador rotativo e análise de LGPD |
| App nativo | A API é a mesma; só a interface é reescrita |

---

## Fontes

- Microdados SSP-SP 2024–2025, análise própria de 03/11/2026 (`04 - Dados Tratados/analise_ssp_capital_2024_2025.json`, script `06 - Scripts/analise_ssp.py`).
- Fundação Técnica de Desenvolvimento (Notion, 12/11/2026), para função de custo, privacidade e combate a viés.
- Disponibilidade de PostGIS 3.3.7 e pgRouting 3.4.1 no Supabase: consulta direta a `pg_available_extensions` em 12/11/2026.
- Galbrun, Pelechrinis e Terzi, "Safe Navigation in Urban Environments": rota segura como problema de dois objetivos com poucas alternativas visíveis.
