-- SafeRoute: esquema inicial (item 6 da SPEC).
-- Toda mudança de esquema é uma nova migração numerada; nunca editar esta depois de aplicada.
--
-- Diferença em relação ao texto da SPEC (ver D12 em docs/DECISIONS.md): as extensões
-- são instaladas no schema "extensions", e não em "public". No Supabase, PostGIS em
-- "public" cria a tabela spatial_ref_sys exposta e sem RLS, o que o Security Advisor
-- aponta como erro e não dá para corrigir depois sem recriar a extensão.

create schema if not exists extensions;
create extension if not exists postgis   with schema extensions;
create extension if not exists pgrouting with schema extensions;

-- Área do piloto (uma linha)
create table pilot_area (
  id        smallint primary key default 1 check (id = 1),
  name      text not null,
  buffer_m  integer not null,
  geom      extensions.geometry(MultiPolygon, 4326) not null
);

-- Nós do grafo (cruzamentos)
create table nodes (
  id    bigint primary key,                       -- id do nó no OSM
  geom  extensions.geometry(Point, 4326) not null
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
  geom        extensions.geometry(LineString, 4326) not null
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
  geom          extensions.geometry(Point, 4326) not null
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

-- Segurança: tudo fechado. RLS ligado e nenhuma política: só o papel de servidor
-- (app_api, criado no M3) acessa, e apenas executando funções.
alter table pilot_area       enable row level security;
alter table nodes            enable row level security;
alter table edges            enable row level security;
alter table crime_events     enable row level security;
alter table risk_runs        enable row level security;
alter table edge_risk        enable row level security;
alter table routing_profiles enable row level security;
alter table app_config       enable row level security;
