-- PostgREST can't decode a raw `geography` value, so expose lat/lng as plain
-- floats for anything that needs to plot reports on a map.
create view reports_map with (security_invoker = true) as
select
  id,
  type,
  species,
  size,
  sex,
  name,
  tags,
  photos,
  address_label,
  radius_m,
  seen_at,
  created_at,
  ST_Y(location::geometry) as lat,
  ST_X(location::geometry) as lng
from reports
where status = 'active';

grant select on reports_map to anon, authenticated;
