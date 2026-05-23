-- ─────────────────────────────────────────────
-- PowerLive — Schema update: multi-source & PostGIS clustering
-- Run this after schema.sql
-- ─────────────────────────────────────────────

-- Enable PostGIS extension
create extension if not exists postgis;

-- Add source tracking columns to outage_reports
alter table outage_reports
  add column if not exists source text not null default 'pwa'
    check (source in ('pwa','telegram','whatsapp','sms','wifi_drop','twitter','tg_group','official')),
  add column if not exists external_id text,
  add column if not exists raw_text text,
  add column if not exists geom geometry(Point, 4326);

-- Index for dedup by external_id
create unique index if not exists idx_reports_external_id
  on outage_reports (external_id)
  where external_id is not null;

-- Index for source analytics
create index if not exists idx_reports_source
  on outage_reports (source, reported_at desc);

-- Spatial index for reports
create index if not exists idx_reports_geom 
  on outage_reports using gist(geom);

-- TNEB infrastructure mapping
create table if not exists tneb_infrastructure (
  id              uuid          default gen_random_uuid() primary key,
  name            text          not null,
  type            text          not null check (type in ('substation', 'transformer')),
  lat             double precision not null,
  lng             double precision not null,
  circle          text,
  zone            text,
  geom            geometry(Point, 4326)
);

create index if not exists idx_tneb_infra_geom 
  on tneb_infrastructure using gist(geom);

-- Drop old views if they exist to avoid dependency conflicts
drop view if exists source_stats_today cascade;
drop view if exists multi_source_outages cascade;
drop view if exists active_outage_clusters cascade;

-- ─────────────────────────────────────────────
-- SOURCE STATS VIEW
-- How many reports came from each channel today
-- ─────────────────────────────────────────────
create or replace view source_stats_today as
select
  source,
  count(*)                                      as total_reports,
  count(*) filter (where status = 'no_power')   as outage_reports,
  count(*) filter (where status = 'power_back') as restoration_reports,
  round(avg(confidence))                        as avg_confidence,
  max(reported_at)                              as last_report_at
from outage_reports
where reported_at >= current_date
group by source
order by total_reports desc;

-- ─────────────────────────────────────────────
-- SOURCE WEIGHT FUNCTION
-- Returns confidence boost per source
-- ─────────────────────────────────────────────
create or replace function source_weight(src text)
returns integer language sql immutable as $$
  select case src
    when 'official'   then 10
    when 'pwa'        then 5
    when 'telegram'   then 5
    when 'whatsapp'   then 5
    when 'sms'        then 4
    when 'tg_group'   then 2
    when 'twitter'    then 1
    when 'wifi_drop'  then 1
    else 1
  end
$$;

-- ─────────────────────────────────────────────
-- EXPONENTIAL CONFIDENCE DECAY FUNCTION
-- Confidence(t) = BaseConfidence * e^(-lambda * minutes)
-- ─────────────────────────────────────────────
create or replace function calculate_decayed_confidence(
  base_conf integer,
  reported_at timestamptz,
  source text
)
returns integer language plpgsql stable as $$
declare
  minutes_elapsed double precision;
  lambda double precision;
  decayed double precision;
begin
  minutes_elapsed := extract(epoch from (now() - reported_at)) / 60.0;
  if minutes_elapsed < 0 then
    minutes_elapsed := 0;
  end if;

  -- Set decay rates (lambda) based on source half-life
  lambda := case source
    when 'wifi_drop' then 0.0231  -- 30 min half-life
    when 'twitter'   then 0.0231  -- 30 min half-life
    when 'tg_group'  then 0.0115  -- 60 min half-life
    else 0.00577                  -- 120 min half-life (community & official)
  end;

  decayed := base_conf::double precision * exp(-lambda * minutes_elapsed);
  return round(decayed)::integer;
end;
$$;

-- ─────────────────────────────────────────────
-- SPATIAL DBSCAN CLUSTERING VIEW
-- Outage reports clustered in 500m proximity
-- ─────────────────────────────────────────────
create or replace view active_outage_clusters as
with active_reports as (
  select
    id,
    status,
    lat,
    lng,
    source,
    reported_at,
    confidence as base_confidence,
    calculate_decayed_confidence(confidence, reported_at, source) as current_confidence,
    coalesce(geom, ST_SetSRID(ST_MakePoint(lng, lat), 4326)) as report_geom
  from outage_reports
  where
    status = 'no_power'
    and is_active = true
    and expires_at > now()
    and lat is not null
    and lng is not null
),
clustered_reports as (
  select
    *,
    ST_ClusterDBSCAN(ST_Transform(report_geom, 3857), eps := 500, minpoints := 2) over () as cluster_id
  from active_reports
)
select
  cluster_id,
  count(*) as report_count,
  array_agg(id) as report_ids,
  array_agg(distinct source) as sources,
  round(avg(current_confidence)) as avg_confidence,
  min(reported_at) as first_reported_at,
  max(reported_at) as last_updated_at,
  ST_AsText(ST_Centroid(ST_Union(report_geom))) as center_geom,
  ST_AsText(ST_ConvexHull(ST_Union(report_geom))) as cluster_polygon
from clustered_reports
where cluster_id is not null
group by cluster_id;

-- ─────────────────────────────────────────────
-- CROSS-SOURCE CONFIRMATION VIEW
-- Areas confirmed by multiple active channels
-- ─────────────────────────────────────────────
create or replace view multi_source_outages as
select
  coalesce(locality, district, 'Unknown') as area,
  district,
  count(distinct source)    as source_count,
  array_agg(distinct source) as sources,
  count(*)                   as total_reports,
  round(avg(calculate_decayed_confidence(confidence, reported_at, source))) as avg_confidence,
  min(reported_at)           as first_reported_at,
  max(reported_at)           as last_updated_at
from outage_reports
where
  status = 'no_power'
  and is_active = true
  and expires_at > now()
  and calculate_decayed_confidence(confidence, reported_at, source) > 10
group by coalesce(locality, district, 'Unknown'), district
having count(distinct source) >= 2
order by source_count desc, total_reports desc;

-- Grant read access to public
grant select on source_stats_today to anon, authenticated;
grant select on active_outage_clusters to anon, authenticated;
grant select on multi_source_outages to anon, authenticated;

-- ─────────────────────────────────────────────
-- K-NEAREST NEIGHBORS (KNN) TNEB INFRASTRUCTURE
-- Returns the closest substation or transformer
-- ─────────────────────────────────────────────
create or replace function get_nearest_infrastructure(
  user_lat double precision,
  user_lng double precision
)
returns table (
  id uuid,
  name text,
  type text,
  distance_meters double precision
) language plpgsql stable as $$
begin
  return query
  select 
    t.id, 
    t.name, 
    t.type,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, 
      t.geom::geography
    ) as distance_meters
  from tneb_infrastructure t
  order by t.geom <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
  limit 1;
end;
$$;

grant execute on function get_nearest_infrastructure(double precision, double precision) to anon, authenticated;
