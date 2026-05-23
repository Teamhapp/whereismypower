-- ─────────────────────────────────────────────
-- PowerLive — Schema update: multi-source support
-- Run this after schema.sql
-- ─────────────────────────────────────────────

-- Add source tracking columns to outage_reports
alter table outage_reports
  add column if not exists source text not null default 'pwa'
    check (source in ('pwa','telegram','whatsapp','sms','wifi_drop','twitter','tg_group','official')),
  add column if not exists external_id text,
  add column if not exists raw_text text;

-- Index for dedup by external_id
create unique index if not exists idx_reports_external_id
  on outage_reports (external_id)
  where external_id is not null;

-- Index for source analytics
create index if not exists idx_reports_source
  on outage_reports (source, reported_at desc);

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
-- CROSS-SOURCE CONFIRMATION VIEW
-- Areas where multiple sources agree on outage
-- ─────────────────────────────────────────────
create or replace view multi_source_outages as
select
  coalesce(locality, district, 'Unknown') as area,
  district,
  count(distinct source)    as source_count,
  array_agg(distinct source) as sources,
  count(*)                   as total_reports,
  round(avg(confidence))     as avg_confidence,
  min(reported_at)           as first_reported_at,
  max(reported_at)           as last_updated_at
from outage_reports
where
  status = 'no_power'
  and is_active = true
  and expires_at > now()
group by coalesce(locality, district, 'Unknown'), district
having count(distinct source) >= 2   -- confirmed by 2+ different channels
order by source_count desc, total_reports desc;

-- Grant read access to public
grant select on source_stats_today to anon, authenticated;
grant select on multi_source_outages to anon, authenticated;
