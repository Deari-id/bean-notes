-- Bean Notes cloud database schema
-- Run this file once in the Supabase SQL Editor.

create table if not exists public.coffee_reviews (
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 70),
  roaster text not null default '',
  origin text not null default '',
  process text not null default '',
  brew text not null default '',
  tasting_notes text[] not null default '{}',
  notes text not null default '',
  rating numeric(2,1) not null check (rating >= 0.5 and rating <= 5),
  favorite_rating numeric(2,1) check (favorite_rating is null or (favorite_rating >= 0.5 and favorite_rating <= 5)),
  photo_path text,
  color text not null default '#d9a56f',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists coffee_reviews_user_id_idx on public.coffee_reviews(user_id);

alter table public.coffee_reviews enable row level security;
revoke all on table public.coffee_reviews from anon, authenticated;
grant select, insert, update, delete on table public.coffee_reviews to authenticated;

drop policy if exists "Users read their own reviews" on public.coffee_reviews;
create policy "Users read their own reviews"
on public.coffee_reviews for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own reviews" on public.coffee_reviews;
create policy "Users create their own reviews"
on public.coffee_reviews for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own reviews" on public.coffee_reviews;
create policy "Users update their own reviews"
on public.coffee_reviews for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own reviews" on public.coffee_reviews;
create policy "Users delete their own reviews"
on public.coffee_reviews for delete to authenticated
using ((select auth.uid()) = user_id);

-- Create a PRIVATE Storage bucket named `coffee-photos` in the Supabase
-- dashboard before applying these policies.

drop policy if exists "Users read their own coffee photos" on storage.objects;
create policy "Users read their own coffee photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'coffee-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users upload their own coffee photos" on storage.objects;
create policy "Users upload their own coffee photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'coffee-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users update their own coffee photos" on storage.objects;
create policy "Users update their own coffee photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'coffee-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'coffee-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users delete their own coffee photos" on storage.objects;
create policy "Users delete their own coffee photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'coffee-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
