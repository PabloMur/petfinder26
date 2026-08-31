insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy "report photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'report-photos');

create policy "anyone can upload report photos"
  on storage.objects for insert
  with check (bucket_id = 'report-photos');
