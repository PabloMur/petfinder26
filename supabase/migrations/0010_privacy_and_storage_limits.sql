-- Keep exact report/sighting coordinates private. Public map data is deliberately
-- snapped to a coarse grid; raw geography remains available to trusted DB code.
alter view public.reports_map set (security_invoker = false);
create or replace view public.reports_map as
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
from public.reports
where status = 'active';
grant select on public.reports_map to anon, authenticated;

-- Public detail access uses a safe projection instead of the base table.
create or replace view public.reports_public with (security_invoker = false) as
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
  null::text as contact_whatsapp,
  null::text as contact_phone,
  status,
  closed_reason,
  created_at
from public.reports;
grant select on public.reports_public to anon, authenticated;

alter view public.sightings_geo set (security_invoker = false);
create or replace view public.sightings_geo as
select
  id,
  report_id,
  note,
  photo,
  created_at,
  ST_Y(ST_SnapToGrid(location::geometry, 0.001)) as lat,
  ST_X(ST_SnapToGrid(location::geometry, 0.001)) as lng
from public.sightings;
grant select on public.sightings_geo to anon, authenticated;

-- Revoke exact coordinates through the base table as well as the public views.
revoke select (location, address_label, contact_whatsapp, contact_phone, owner_id)
  on public.reports from anon, authenticated;
revoke select (location) on public.sightings from anon, authenticated;

-- Restrict the public photo bucket at the storage layer. Client-side checks are
-- only UX; these limits still apply to direct Storage API requests.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'report-photos';

-- Only allow image objects in the per-report token namespace. Bucket-level
-- MIME and size restrictions above still apply to direct Storage API requests.
drop policy if exists "anyone can upload report photos" on storage.objects;
create policy "limited report photo uploads"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'report-photos'
    and name ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}-[^/]+$'
  );
