-- Optional place where the coffee was enjoyed. Existing reviews keep a blank value.
alter table public.coffee_reviews
  add column if not exists venue text not null default '';
