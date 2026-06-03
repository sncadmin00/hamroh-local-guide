create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  item_type text not null check (item_type in ('guide','tour','city')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

grant select, insert, delete on public.wishlists to authenticated;
grant all on public.wishlists to service_role;

alter table public.wishlists enable row level security;

create policy "Users view own wishlist" on public.wishlists
  for select to authenticated using (auth.uid() = user_id);

create policy "Users add to own wishlist" on public.wishlists
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Users remove from own wishlist" on public.wishlists
  for delete to authenticated using (auth.uid() = user_id);

create index wishlists_user_idx on public.wishlists(user_id);