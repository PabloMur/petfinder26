-- Matching: whenever a report is created, score it against active reports of
-- the opposite type (lost <-> found) and record candidates above a floor.
-- v1 signal is deliberately cheap (species/size/tags/distance/date) — no photo
-- similarity yet, that needs a vision model and is out of scope for the MVP.
create function compute_matches_for_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
      v_attrs := v_attrs || 'size';
    end if;

    if candidate.sex is not null and candidate.sex = r.sex and r.sex <> 'unknown' then
      v_score := v_score + 5;
      v_attrs := v_attrs || 'sex';
    end if;

    -- shared descriptive tags (collar color, chip, etc.), capped so one report
    -- with a long tag list can't dominate the score
    v_attrs := v_attrs || (
      select coalesce(array_agg(tag), '{}')
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
      v_attrs := v_attrs || 'zona';
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

      insert into alerts (claim_token, owner_id, type, report_id, message)
      values (
        candidate.claim_token,
        candidate.owner_id,
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
