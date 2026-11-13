-- SafeRoute: funções de leitura e papel do servidor (itens 8 e 9 da SPEC).
--
-- O app conecta com o papel app_api, que NÃO lê nenhuma tabela: só executa as
-- funções abaixo. A senha do papel é definida fora do Git (data/pipeline/07_load_db.py).
--
-- Regra do SQL dinâmico: todo valor que entra no texto passado ao pgr_dijkstra é
-- número (validado pela assinatura) ou passa por %L. Nunca concatenar texto do usuário.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_api') then
    create role app_api nologin;
  end if;
end $$;

-- Metadados para a tela: área, período dos dados, perfis.
create or replace function get_meta() returns jsonb
language sql stable security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'area', (select jsonb_build_object(
               'name', a.name,
               'buffer_m', a.buffer_m,
               'geometry', st_asgeojson(a.geom, 6)::jsonb,
               'bbox', jsonb_build_array(st_xmin(a.geom), st_ymin(a.geom),
                                         st_xmax(a.geom), st_ymax(a.geom)))
             from pilot_area a where a.id = 1),
    'run', (select jsonb_build_object(
              'id', r.id, 'data_from', r.data_from, 'data_to', r.data_to)
            from app_config c join risk_runs r on r.id = c.active_run_id
            where c.id = 1),
    'profiles', (select jsonb_agg(jsonb_build_object('key', p.key, 'label', p.label)
                                  order by p.sort)
                 from routing_profiles p)
  );
$$;

-- Até três rotas entre dois pontos, uma por perfil.
create or replace function get_routes(
  o_lng double precision, o_lat double precision,
  d_lng double precision, d_lat double precision,
  p_mode text, p_bucket integer
) returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_o   geometry := st_setsrid(st_makepoint(o_lng, o_lat), 4326);
  v_d   geometry := st_setsrid(st_makepoint(d_lng, d_lat), 4326);
  v_run integer  := (select active_run_id from app_config where id = 1);
  v_src bigint;  v_dst bigint;
  v_box geometry;
  v_sql text;    v_route jsonb;  v_out jsonb := '[]'::jsonb;
  p     record;
begin
  if p_mode is null or p_mode not in ('walk','drive')
     or p_bucket is null or p_bucket not between 0 and 7 then
    return jsonb_build_object('error', 'invalid_params');
  end if;
  if v_run is null then
    return jsonb_build_object('error', 'no_route');
  end if;
  if not exists (select 1 from pilot_area a
                 where st_covers(a.geom, v_o) and st_covers(a.geom, v_d)) then
    return jsonb_build_object('error', 'out_of_area');
  end if;

  select e.source into v_src from edges e where e.mode = p_mode
   order by e.geom <-> v_o limit 1;
  select e.target into v_dst from edges e where e.mode = p_mode
   order by e.geom <-> v_d limit 1;
  if v_src is null or v_dst is null then
    return jsonb_build_object('error', 'no_route');
  end if;
  if v_src = v_dst then
    return jsonb_build_object('error', 'same_point');
  end if;

  -- Recorte: caixa em volta de origem e destino com margem de ~1,5 km.
  v_box := st_expand(st_envelope(st_collect(v_o, v_d)), 0.015);

  for p in select key, label, beta from routing_profiles order by sort loop
    v_sql := format(
      'select e.id, e.source, e.target,
              (e.time_s * (1 + %s * coalesce(r.score, 0)))::float8 as cost
         from edges e
         left join edge_risk r
           on r.edge_id = e.id and r.run_id = %s and r.bucket = %s
        where e.mode = %L
          and e.geom && st_setsrid(st_makebox2d(st_makepoint(%s, %s), st_makepoint(%s, %s)), 4326)',
      p.beta, v_run, p_bucket, p_mode,
      st_xmin(v_box), st_ymin(v_box), st_xmax(v_box), st_ymax(v_box));

    select jsonb_build_object(
             'profile',  p.key,
             'label',    p.label,
             'time_s',   round(sum(e.time_s)),
             'length_m', round(sum(e.length_m)),
             'exposure', sum(coalesce(r.score, 0) * e.length_m),
             'segments', jsonb_agg(jsonb_build_object(
                           'edge_id', e.id,
                           'score',   round(coalesce(r.score, 0)::numeric, 3),
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

-- Permissões: ninguém além do app_api executa; app_api não lê tabela nenhuma.
revoke all on function get_meta() from public;
revoke all on function get_routes(double precision, double precision,
                                  double precision, double precision, text, integer) from public;
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on function get_meta() from %I', r);
      execute format('revoke all on function get_routes(double precision, double precision,
                        double precision, double precision, text, integer) from %I', r);
    end if;
  end loop;
end $$;

grant usage on schema public to app_api;
grant execute on function get_meta() to app_api;
grant execute on function get_routes(double precision, double precision,
                                     double precision, double precision, text, integer) to app_api;
