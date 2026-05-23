-- ─────────────────────────────────────────────
-- PowerLive — Scheduled outages (official source)
-- Separate from outage_reports: official data,
-- no confidence scoring needed, has time windows.
-- ─────────────────────────────────────────────

create table if not exists scheduled_outages (
  id              uuid      default gen_random_uuid() primary key,
  area_name       text      not null,
  district        text      not null default 'Chennai',
  lat             double precision,
  lng             double precision,
  scheduled_date  date      not null,
  start_time      time      not null,
  end_time        time      not null,
  duration_hours  numeric(4,1),
  affected_streets text,
  substation      text,
  raw_text        text,
  source_url      text,
  source          text      not null default 'official',
  scraped_at      timestamptz default now(),
  is_active       boolean   default true
);

-- Dedup: same area + date + start_time = same notice
create unique index if not exists idx_scheduled_dedup
  on scheduled_outages (area_name, scheduled_date, start_time);

create index if not exists idx_scheduled_date
  on scheduled_outages (scheduled_date, is_active);

create index if not exists idx_scheduled_coords
  on scheduled_outages (lat, lng)
  where lat is not null;

-- View: today and tomorrow's scheduled cuts with active flag
create or replace view upcoming_scheduled_outages as
select
  *,
  (scheduled_date = current_date
    and now()::time between start_time and end_time) as currently_active,
  (scheduled_date = current_date and start_time > now()::time) as upcoming_today,
  (scheduled_date = current_date + 1)                          as tomorrow
from scheduled_outages
where
  scheduled_date between current_date and current_date + 1
  and is_active = true
order by scheduled_date, start_time;

grant select on upcoming_scheduled_outages to anon, authenticated;
