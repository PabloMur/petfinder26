-- A Turnstile pass is verified by the server and stored in this private,
-- short-lived table. Anonymous clients cannot create or read passes directly.
create table public.publish_verifications (
  id uuid primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '5 minutes'),
  consumed_at timestamptz
);

-- Contact data is returned only by the server after owner-token validation or
-- a separate Turnstile challenge, never in the public detail projection.
create or replace view public.reports_public with (security_invoker = false) as
select
  id, type, species, size, sex, name, tags, description, photos,
  case
    when address_label like '%,%' then regexp_replace(address_label, '^[^,]+,\s*', '')
    else null
  end as address_label,
  radius_m, seen_at,
  null::text as contact_whatsapp,
  null::text as contact_phone,
  status, closed_reason, created_at
from public.reports;

alter table public.publish_verifications enable row level security;
revoke all on public.publish_verifications from anon, authenticated, public;
grant insert, delete on public.publish_verifications to service_role;

alter table public.reports
  add column publish_verification_id uuid references public.publish_verifications(id) on delete set null;

create function public.consume_publish_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.publish_verifications
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
before insert on public.reports
for each row execute function public.consume_publish_verification();

-- Upload names are namespaced by the verified pass. Locking its row serializes
-- concurrent uploads and caps a single pass at the six photos the UI supports.
create function public.can_upload_report_photo(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  verification_id uuid;
  uploaded_count integer;
begin
  if object_name !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-[^/]+$' then
    return false;
  end if;

  verification_id := split_part(object_name, '/', 1)::uuid;

  perform 1
    from public.publish_verifications
   where id = verification_id
     and consumed_at is null
     and expires_at > now()
   for update;

  if not found then
    return false;
  end if;

  select count(*)::integer into uploaded_count
    from storage.objects
   where bucket_id = 'report-photos'
     and split_part(name, '/', 1) = verification_id::text;

  return uploaded_count < 6;
end;
$$;

revoke all on function public.consume_publish_verification() from public, anon, authenticated;
revoke all on function public.can_upload_report_photo(text) from public;
grant execute on function public.can_upload_report_photo(text) to anon, authenticated;

drop policy if exists "limited report photo uploads" on storage.objects;
create policy "verified limited report photo uploads"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'report-photos'
    and public.can_upload_report_photo(name)
  );
