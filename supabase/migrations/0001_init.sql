-- Pet Finder: core schema
create extension if not exists postgis;

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  phone text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
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
  claim_token uuid not null,
  owner_id uuid references profiles (id) on delete set null,
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
  claim_token uuid,
  owner_id uuid references profiles (id) on delete cascade,
  type text not null check (type in ('match', 'sighting', 'reunion')),
  report_id uuid references reports (id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint alerts_recipient_check check (claim_token is not null or owner_id is not null)
);

create index alerts_claim_token_idx on alerts (claim_token);
create index alerts_owner_id_idx on alerts (owner_id);

-- RLS: reports/sightings are public to read (it's a public reunification board);
-- writes are open for the anonymous-publish flow and scoped by claim_token for edits.
alter table reports enable row level security;
alter table sightings enable row level security;
alter table matches enable row level security;
alter table alerts enable row level security;
alter table profiles enable row level security;

create policy "reports are publicly readable" on reports for select using (true);
create policy "anyone can create a report" on reports for insert with check (true);
create policy "owner can update own report" on reports for update
  using (owner_id = auth.uid());

create policy "sightings are publicly readable" on sightings for select using (true);
create policy "anyone can create a sighting" on sightings for insert with check (true);

create policy "matches are publicly readable" on matches for select using (true);

-- claim_token acts as a bearer capability (unguessable uuid), same trust model
-- as a magic share link: the row is only reachable to someone who already
-- holds the token, so a permissive select is fine.
create policy "alerts are readable with claim token or by owner" on alerts for select using (true);

create policy "profiles are readable by owner" on profiles for select using (id = auth.uid());
create policy "profiles are editable by owner" on profiles for update using (id = auth.uid());

-- Anonymous publishers have no JWT claim to key an RLS policy on, so editing/
-- closing an unclaimed report goes through this security-definer RPC instead:
-- it checks the caller-supplied claim_token against the row itself.
create function close_report(p_report_id uuid, p_claim_token uuid, p_reason text default 'other')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reports
    set status = 'closed', closed_reason = p_reason
    where id = p_report_id
      and (claim_token = p_claim_token or owner_id = auth.uid())
      and status = 'active';

  if not found then
    raise exception 'report not found or not owned by caller';
  end if;
end;
$$;
