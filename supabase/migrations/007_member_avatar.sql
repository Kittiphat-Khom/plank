-- Add avatar_url to members
alter table public.members add column if not exists avatar_url text;

-- Create avatars storage bucket (public)
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload to avatars bucket
create policy if not exists "avatars upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars');

create policy if not exists "avatars public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy if not exists "avatars owner update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars');

create policy if not exists "avatars owner delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars');
