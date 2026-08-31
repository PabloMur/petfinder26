-- Same problem as reports_map (migration 0003): PostgREST can't decode a
-- raw geography value, so expose lat/lng as plain floats. No claim_token
-- here to worry about — a plain view is enough, no RPC indirection needed.
create view sightings_geo with (security_invoker = true) as
select
  id,
  report_id,
  note,
  photo,
  created_at,
  ST_Y(location::geometry) as lat,
  ST_X(location::geometry) as lng
from sightings;

grant select on sightings_geo to anon, authenticated;
