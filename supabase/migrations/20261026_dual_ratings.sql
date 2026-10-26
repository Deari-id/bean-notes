-- Apply once to an existing Bean Notes project before publishing the dual-rating app.
-- Existing reviews keep their Taste score; Favorite remains unrated until edited.

alter table public.coffee_reviews
  add column if not exists favorite_rating numeric(2,1);

alter table public.coffee_reviews
  drop constraint if exists coffee_reviews_rating_check;

alter table public.coffee_reviews
  add constraint coffee_reviews_rating_check
  check (rating >= 0.5 and rating <= 5);

alter table public.coffee_reviews
  drop constraint if exists coffee_reviews_favorite_rating_check;

alter table public.coffee_reviews
  add constraint coffee_reviews_favorite_rating_check
  check (favorite_rating is null or (favorite_rating >= 0.5 and favorite_rating <= 5));
