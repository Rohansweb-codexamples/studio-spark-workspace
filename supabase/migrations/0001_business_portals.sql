-- Business portals: businesses, members, and branded portal links.
-- Run this in the Supabase SQL editor (or via the DB connection string) once.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logo_url text,
  primary_color text not null default '#138a7a',
  accent_color text not null default '#0ea5e9',
  welcome_text text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create table if not exists public.business_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order int not null default 0
);

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.business_links enable row level security;

-- businesses: visible if published, owned, or you are a member.
drop policy if exists "businesses_select" on public.businesses;
create policy "businesses_select" on public.businesses
  for select using (
    published = true
    or owner_id = auth.uid()
    or exists (
      select 1 from public.business_members bm
      where bm.business_id = businesses.id and bm.user_id = auth.uid()
    )
  );

drop policy if exists "businesses_owner_write" on public.businesses;
create policy "businesses_owner_write" on public.businesses
  for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- business_members: a member sees their own rows; the business owner sees all.
drop policy if exists "members_select" on public.business_members;
create policy "members_select" on public.business_members
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.owner_id = auth.uid()
    )
  );

drop policy if exists "members_owner_write" on public.business_members;
create policy "members_owner_write" on public.business_members
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_members.business_id and b.owner_id = auth.uid()
    )
  );

-- business_links: visible on published portals, or to the owner/members.
drop policy if exists "links_select" on public.business_links;
create policy "links_select" on public.business_links
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = business_links.business_id
      and (
        b.published = true
        or b.owner_id = auth.uid()
        or exists (select 1 from public.business_members bm where bm.business_id = b.id and bm.user_id = auth.uid())
      )
    )
  );

drop policy if exists "links_owner_write" on public.business_links;
create policy "links_owner_write" on public.business_links
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = business_links.business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = business_links.business_id and b.owner_id = auth.uid()
    )
  );
