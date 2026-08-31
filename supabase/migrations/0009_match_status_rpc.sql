-- matches has a select-all policy but no update path: nothing has ever
-- moved a match out of 'pending'. Confirming/dismissing needs to check the
-- caller owns one side of the match, and claim_token isn't publicly
-- readable (migration 0004) — same shape as close_report(), a
-- security-definer RPC that checks the token against the row itself.
create function update_match_status(p_match_id uuid, p_claim_token uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches%rowtype;
begin
  if p_status not in ('confirmed', 'dismissed') then
    raise exception 'invalid status: %', p_status;
  end if;

  select * into v_match from matches where id = p_match_id;
  if not found then
    raise exception 'match not found';
  end if;

  if not exists (
    select 1 from reports
    where id in (v_match.lost_report_id, v_match.found_report_id)
      and claim_token = p_claim_token
  ) then
    raise exception 'not authorized for this match';
  end if;

  update matches set status = p_status where id = p_match_id;
end;
$$;

grant execute on function update_match_status(uuid, uuid, text) to anon, authenticated;
