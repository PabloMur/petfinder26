-- Same issue as migration 0004, one hop removed: alerts.claim_token is
-- copied straight from the report it's about, so exposing it through the
-- default "select *" grant would let anyone harvest every report's
-- claim_token off the public alerts feed and hijack it via close_report().
-- Column-level grants can't fix this one, because filtering by claim_token
-- (`where claim_token = any(...)`) itself requires SELECT on that column —
-- so reads go through a security-definer RPC instead, which can filter on
-- the column internally without ever putting it in the result.
revoke select on alerts from anon, authenticated;

create function get_my_alerts(p_claim_tokens uuid[])
returns table (
  id uuid,
  type text,
  report_id uuid,
  message text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select id, type, report_id, message, read_at, created_at
  from alerts
  where claim_token = any(p_claim_tokens) or owner_id = auth.uid()
  order by created_at desc;
$$;

grant execute on function get_my_alerts(uuid[]) to anon, authenticated;

create function mark_alerts_read(p_alert_ids uuid[], p_claim_tokens uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update alerts set read_at = now()
  where id = any(p_alert_ids)
    and read_at is null
    and (claim_token = any(p_claim_tokens) or owner_id = auth.uid());
$$;

grant execute on function mark_alerts_read(uuid[], uuid[]) to anon, authenticated;
