-- claim_token is a bearer credential (see close_report()): whoever holds it
-- can edit/close that report without an account. RLS is row-level only, so
-- the earlier "publicly readable" policy on `reports` was also handing out
-- everyone's claim_token through plain `select *` — anyone could read it off
-- one report and use it to hijack another. Column-level grants close that:
-- the client already has its own token from the moment it published (see
-- lib/supabase/claim-token.ts), it never needs to read it back from the API.
revoke select on reports from anon, authenticated;
grant select (
  id, type, species, size, sex, name, tags, description, photos, location,
  address_label, radius_m, seen_at, contact_whatsapp, contact_phone,
  status, closed_reason, owner_id, created_at
) on reports to anon, authenticated;
