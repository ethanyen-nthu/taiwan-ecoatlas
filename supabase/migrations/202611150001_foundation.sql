-- Milestone 1 only. Apply through Supabase SQL editor or `supabase db push`.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create table public.environmental_sources (
  id text primary key,
  name_en text not null, name_zh text not null,
  agency_en text not null, agency_zh text not null,
  original_url text not null, dataset_identifier text not null,
  licence text not null, expected_update_frequency text not null,
  last_observation_at timestamptz, last_successful_retrieval_at timestamptz,
  synchronization_status text not null default 'not-configured'
    check (synchronization_status in ('fresh','stale','unavailable','not-configured','historical-only')),
  published boolean not null default false
);
create table public.counties (
  code text primary key, name_en text not null, name_zh text not null,
  source_id text not null references public.environmental_sources(id),
  boundary_edition date not null,
  geom extensions.geometry(MultiPolygon,4326) not null,
  published boolean not null default true,
  check (extensions.ST_IsValid(geom))
);
create index counties_geom_idx on public.counties using gist(geom);
create table public.source_sync_runs (
  id bigint generated always as identity primary key,
  source_id text not null references public.environmental_sources(id),
  started_at timestamptz not null default now(), finished_at timestamptz,
  status text not null check(status in ('success','failed')),
  accepted_count integer not null default 0, excluded_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_code text -- Generic codes only. Never credentials or upstream request URLs.
);
create index source_sync_runs_source_time_idx on public.source_sync_runs(source_id,started_at desc);
create table public.source_snapshots (
  source_id text primary key references public.environmental_sources(id),
  payload jsonb not null,
  retrieved_at timestamptz not null
);
create table public.aqi_observations (
  id bigint generated always as identity primary key,
  source_id text not null references public.environmental_sources(id),
  source_station_id text not null, station_name text not null,
  county_code text references public.counties(code),
  observed_at timestamptz not null, published_at timestamptz, retrieved_at timestamptz not null default now(),
  aqi numeric check(aqi>=0), official_status text,
  pm25 numeric check(pm25>=0), pm10 numeric check(pm10>=0),
  ozone numeric check(ozone>=0), nitrogen_dioxide numeric check(nitrogen_dioxide>=0),
  sulfur_dioxide numeric check(sulfur_dioxide>=0), carbon_monoxide numeric check(carbon_monoxide>=0),
  geom extensions.geometry(Point,4326) not null,
  published boolean not null default false,
  unique(source_id,source_station_id,observed_at),
  check(extensions.ST_X(geom) between 117 and 125 and extensions.ST_Y(geom) between 20 and 27)
);
create index aqi_geom_idx on public.aqi_observations using gist(geom);
create index aqi_time_idx on public.aqi_observations(observed_at desc);
create table public.weather_observations (
  id bigint generated always as identity primary key,
  source_id text not null references public.environmental_sources(id),
  source_dataset_id text not null, source_station_id text not null,
  station_name text not null, county_code text references public.counties(code),
  observed_at timestamptz not null, published_at timestamptz, retrieved_at timestamptz not null default now(),
  temperature numeric check(temperature between -50 and 60),
  daily_rainfall numeric check(daily_rainfall>=0), humidity numeric check(humidity between 0 and 100),
  wind_speed numeric check(wind_speed>=0), wind_direction numeric check(wind_direction between 0 and 360),
  geom extensions.geometry(Point,4326) not null,
  published boolean not null default false,
  unique(source_id,source_station_id,observed_at),
  check(extensions.ST_X(geom) between 117 and 125 and extensions.ST_Y(geom) between 20 and 27)
);
create index weather_geom_idx on public.weather_observations using gist(geom);
create index weather_time_idx on public.weather_observations(observed_at desc);

alter table public.environmental_sources enable row level security;
alter table public.counties enable row level security;
alter table public.source_sync_runs enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.aqi_observations enable row level security;
alter table public.weather_observations enable row level security;
revoke all on public.environmental_sources,public.counties,public.source_sync_runs,public.source_snapshots,public.aqi_observations,public.weather_observations from anon,authenticated;
grant select on public.environmental_sources,public.counties,public.aqi_observations,public.weather_observations to anon,authenticated;
create policy "Published sources read only" on public.environmental_sources for select to anon,authenticated using(published);
create policy "Published counties read only" on public.counties for select to anon,authenticated using(published);
create policy "Published AQI read only" on public.aqi_observations for select to anon,authenticated using(published);
create policy "Published weather read only" on public.weather_observations for select to anon,authenticated using(published);
grant all on public.environmental_sources,public.counties,public.source_sync_runs,public.source_snapshots,public.aqi_observations,public.weather_observations to service_role;
grant usage,select on all sequences in schema public to service_role;

create function public.import_counties(payload jsonb) returns integer
language plpgsql security invoker set search_path = public,extensions as $$
declare count_rows integer;
begin
  if jsonb_array_length(payload->'features') <> 22 then raise exception 'Expected 22 counties'; end if;
  insert into public.counties(code,name_en,name_zh,source_id,boundary_edition,geom)
  select f->'properties'->>'COUNTYCODE',f->'properties'->>'COUNTYENG',f->'properties'->>'COUNTYNAME',
    'counties','2025-03-18',extensions.ST_Multi(extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(f->'geometry'),4326))
  from jsonb_array_elements(payload->'features') f
  on conflict(code) do update set name_en=excluded.name_en,name_zh=excluded.name_zh,geom=excluded.geom,boundary_edition=excluded.boundary_edition;
  get diagnostics count_rows = row_count;
  return count_rows;
end $$;
revoke execute on function public.import_counties(jsonb) from public,anon,authenticated;
grant execute on function public.import_counties(jsonb) to service_role;
