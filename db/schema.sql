-- Pet Finder: schema for Neon Postgres. Apply it once to an empty database
-- with `npm run db:schema`.
--
-- The browser never talks to the database: every read and write goes through
-- a route handler in app/api, and that is where access control lives. What
-- stays in SQL is what must hold no matter which handler runs: coarse public
-- coordinates, single-use publish passes and matching.
create extension if not exists postgis;

-- A Turnstile pass verified by /api/publish/verify. It authorizes one report
-- insert and up to six photo uploads (their pathnames are recorded here so the
-- insert can only reference photos uploaded under this pass) within 5 minutes.
create table publish_verifications (
  id uuid primary key,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('lost', 'found')),
  species text not null check (species in ('dog', 'cat', 'other')),
  size text check (size in ('small', 'medium', 'large')),
  sex text check (sex in ('male', 'female', 'unknown')),
  name text,
  tags text[] not null default '{}',
  description text,
  photos text[] not null default '{}',
  location geography(point, 4326) not null,
  address_label text,
  radius_m integer not null default 1500,
  seen_at timestamptz not null default now(),
  contact_whatsapp text,
  contact_phone text,
  status text not null default 'active' check (status in ('active', 'closed')),
  closed_reason text check (closed_reason in ('reunion', 'other')),
  -- Bearer capability for anonymous publishers (see lib/claim-token.ts):
  -- whoever holds it can close the report and review its matches. No handler
  -- ever returns it.
  claim_token uuid not null,
  publish_verification_id uuid references publish_verifications (id) on delete set null,
  created_at timestamptz not null default now()
);

create index reports_location_idx on reports using gist (location);
create index reports_claim_token_idx on reports (claim_token);
create index reports_status_idx on reports (status);

create table sightings (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports (id) on delete cascade,
  note text,
  photo text,
  location geography(point, 4326) not null,
  created_at timestamptz not null default now()
);

create index sightings_report_id_idx on sightings (report_id);

create table matches (
  id uuid primary key default gen_random_uuid(),
  lost_report_id uuid not null references reports (id) on delete cascade,
  found_report_id uuid not null references reports (id) on delete cascade,
  score numeric not null,
  matched_attrs text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (lost_report_id, found_report_id)
);

create table alerts (
  id uuid primary key default gen_random_uuid(),
  -- Copied from the report the alert is about, so it is as sensitive as
  -- reports.claim_token: handlers filter on it but never return it.
  claim_token uuid not null,
  type text not null check (type in ('match', 'sighting', 'reunion')),
  report_id uuid references reports (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index alerts_claim_token_idx on alerts (claim_token);

-- Public projections. Coordinates are snapped to a ~100 m grid and the street
-- part of the address is dropped, so nothing public pins down a home address.
-- Contact details are left out entirely: /api/report/contact hands them out
-- after a separate Turnstile challenge.
create view reports_map as
select
  id,
  type,
  species,
  size,
  sex,
  name,
  tags,
  photos,
  case
    when address_label like '%,%' then regexp_replace(address_label, '^[^,]+,\s*', '')
    else null
  end as address_label,
  radius_m,
  seen_at,
  created_at,
  ST_Y(ST_SnapToGrid(location::geometry, 0.001)) as lat,
  ST_X(ST_SnapToGrid(location::geometry, 0.001)) as lng
from reports
where status = 'active';

create view reports_public as
select
  id,
  type,
  species,
  size,
  sex,
  name,
  tags,
  description,
  photos,
  case
    when address_label like '%,%' then regexp_replace(address_label, '^[^,]+,\s*', '')
    else null
  end as address_label,
  radius_m,
  seen_at,
  status,
  closed_reason,
  created_at
from reports;

create view sightings_geo as
select
  id,
  report_id,
  note,
  photo,
  created_at,
  ST_Y(ST_SnapToGrid(location::geometry, 0.001)) as lat,
  ST_X(ST_SnapToGrid(location::geometry, 0.001)) as lng
from sightings;

-- Every report insert spends a fresh, unexpired pass, so a single Turnstile
-- solve can't be replayed into a batch of reports.
create function consume_publish_verification()
returns trigger
language plpgsql
as $$
begin
  update publish_verifications
     set consumed_at = now()
   where id = new.publish_verification_id
     and consumed_at is null
     and expires_at > now();

  if not found then
    raise exception 'A fresh publication verification is required';
  end if;

  return new;
end;
$$;

create trigger reports_require_publish_verification
  before insert on reports
  for each row
  execute function consume_publish_verification();

-- Matching: whenever a report is created, score it against active reports of
-- the opposite type (lost <-> found) and record candidates above a floor.
-- The signal is deliberately cheap (species/size/tags/distance/date) — no
-- photo similarity, that needs a vision model.
--
-- Scalar appends use array_append(): `text_array || 'literal'` is ambiguous in
-- plpgsql and can be parsed as array||array, raising "malformed array literal".
create function compute_matches_for_report(p_report_id uuid)
returns void
language plpgsql
as $$
declare
  r reports%rowtype;
  candidate reports%rowtype;
  v_score numeric;
  v_attrs text[];
  v_distance_m numeric;
  v_days_apart numeric;
begin
  select * into r from reports where id = p_report_id;
  if not found or r.status <> 'active' then
    return;
  end if;

  for candidate in
    select * from reports
    where status = 'active'
      and species = r.species
      and type <> r.type
      and id <> r.id
      -- search radius: whichever report cast the wider net
      and ST_DWithin(location, r.location, greatest(r.radius_m, radius_m))
  loop
    v_score := 30; -- species match is the entry ticket
    v_attrs := array['species'];

    if candidate.size is not null and candidate.size = r.size then
      v_score := v_score + 20;
      v_attrs := array_append(v_attrs, 'size');
    end if;

    if candidate.sex is not null and candidate.sex = r.sex and r.sex <> 'unknown' then
      v_score := v_score + 5;
      v_attrs := array_append(v_attrs, 'sex');
    end if;

    -- shared descriptive tags (collar color, chip, etc.), capped so one report
    -- with a long tag list can't dominate the score
    v_attrs := v_attrs || (
      select coalesce(array_agg(tag), '{}'::text[])
      from unnest(r.tags) as tag
      where tag = any(candidate.tags)
    );
    v_score := v_score + least(20, 10 * (array_length(v_attrs, 1) - array_position(v_attrs, 'species')));

    v_distance_m := ST_Distance(r.location, candidate.location);
    v_score := v_score + case
      when v_distance_m <= 500 then 25
      when v_distance_m <= 2000 then 15
      when v_distance_m <= 5000 then 5
      else 0
    end;
    if v_distance_m <= 5000 then
      v_attrs := array_append(v_attrs, 'zona');
    end if;

    v_days_apart := abs(extract(epoch from (r.seen_at - candidate.seen_at)) / 86400);
    v_score := v_score + case
      when v_days_apart <= 1 then 10
      when v_days_apart <= 5 then 5
      else 0
    end;

    v_score := least(v_score, 99);

    if v_score >= 40 then
      insert into matches (lost_report_id, found_report_id, score, matched_attrs)
      values (
        case when r.type = 'lost' then r.id else candidate.id end,
        case when r.type = 'found' then r.id else candidate.id end,
        v_score,
        v_attrs
      )
      on conflict (lost_report_id, found_report_id)
        do update set score = excluded.score, matched_attrs = excluded.matched_attrs;

      insert into alerts (claim_token, type, report_id, message)
      values (
        candidate.claim_token,
        'match',
        candidate.id,
        format('Posible coincidencia (%s%%) con otro reporte cerca tuyo.', round(v_score))
      );
    end if;
  end loop;
end;
$$;

create function trigger_compute_matches()
returns trigger
language plpgsql
as $$
begin
  perform compute_matches_for_report(new.id);
  return new;
end;
$$;

create trigger reports_after_insert_compute_matches
  after insert on reports
  for each row
  execute function trigger_compute_matches();
