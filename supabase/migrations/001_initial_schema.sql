-- ============================================================
-- Dish Diary - Full Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- Auto-created when a user signs up via auth trigger
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  email text not null,
  avatar_color text default '#1a5c1a',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- FRIEND CONNECTIONS
-- Users must accept before being linked
-- ============================================================
create table public.friend_requests (
  id uuid default uuid_generate_v4() primary key,
  from_user_id uuid references public.profiles(id) on delete cascade not null,
  to_user_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz default now(),
  unique(from_user_id, to_user_id)
);

alter table public.friend_requests enable row level security;

create policy "Users can see their own requests"
  on public.friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can send requests"
  on public.friend_requests for insert
  with check (auth.uid() = from_user_id);

create policy "Recipients can update status"
  on public.friend_requests for update
  using (auth.uid() = to_user_id);

create policy "Either party can delete"
  on public.friend_requests for delete
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

-- ============================================================
-- RESTAURANTS
-- Shared across all users; created once, referenced by entries
-- ============================================================
create table public.restaurants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  address text,
  cuisine text,
  google_place_id text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.restaurants enable row level security;

create policy "Anyone authenticated can view restaurants"
  on public.restaurants for select using (auth.role() = 'authenticated');

create policy "Authenticated users can create restaurants"
  on public.restaurants for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- DINING SESSIONS
-- Optional shared session for a table of diners
-- ============================================================
create table public.dining_sessions (
  id uuid default uuid_generate_v4() primary key,
  code text unique not null,
  restaurant_id uuid references public.restaurants(id),
  created_by uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('active', 'ended')) default 'active',
  created_at timestamptz default now(),
  ended_at timestamptz
);

alter table public.dining_sessions enable row level security;

create policy "Session creator can manage session"
  on public.dining_sessions for all
  using (auth.uid() = created_by);

create policy "Participants can view active sessions"
  on public.dining_sessions for select
  using (
    status = 'active' or
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = id and sp.user_id = auth.uid()
    )
  );

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================
create table public.session_participants (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.dining_sessions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(session_id, user_id)
);

alter table public.session_participants enable row level security;

create policy "Session members can see participants"
  on public.session_participants for select
  using (
    auth.uid() = user_id or
    exists (
      select 1 from public.dining_sessions ds
      where ds.id = session_id and ds.created_by = auth.uid()
    )
  );

create policy "Users can join sessions"
  on public.session_participants for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- DIARY ENTRIES
-- Core table - one row per person per dish per visit
-- ============================================================
create table public.diary_entries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  restaurant_id uuid references public.restaurants(id) not null,
  session_id uuid references public.dining_sessions(id),
  item_name text not null,
  item_category text,
  visit_date date not null default current_date,
  rating_overall numeric(2,1) check (rating_overall between 1 and 5),
  rating_flavor integer check (rating_flavor between 1 and 5),
  rating_temperature integer check (rating_temperature between 1 and 5),
  rating_texture integer check (rating_texture between 1 and 5),
  rating_presentation integer check (rating_presentation between 1 and 5),
  rating_value integer check (rating_value between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

alter table public.diary_entries enable row level security;

-- Users can always see their own entries
create policy "Users can manage their own entries"
  on public.diary_entries for all
  using (auth.uid() = user_id);

-- Friends can see each other's entries
create policy "Friends can view each other's entries"
  on public.diary_entries for select
  using (
    exists (
      select 1 from public.friend_requests fr
      where fr.status = 'accepted'
        and (
          (fr.from_user_id = auth.uid() and fr.to_user_id = user_id) or
          (fr.to_user_id = auth.uid() and fr.from_user_id = user_id)
        )
    )
  );

-- Session members can view session entries
create policy "Session members can view session entries"
  on public.diary_entries for select
  using (
    session_id is not null and
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = diary_entries.session_id
        and sp.user_id = auth.uid()
    )
  );

-- ============================================================
-- WISHLIST
-- ============================================================
create table public.wishlist (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  item_name text not null,
  restaurant_name text,
  priority text check (priority in ('high', 'med', 'low')) default 'med',
  notes text,
  created_at timestamptz default now()
);

alter table public.wishlist enable row level security;

create policy "Users manage their own wishlist"
  on public.wishlist for all
  using (auth.uid() = user_id);

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Aggregated dish stats per user per restaurant
create or replace view public.dish_stats as
select
  de.user_id,
  de.restaurant_id,
  de.item_name,
  de.item_category,
  count(*) as visit_count,
  round(avg(de.rating_overall), 1) as avg_rating,
  round(avg(de.rating_flavor), 1) as avg_flavor,
  round(avg(de.rating_temperature), 1) as avg_temperature,
  round(avg(de.rating_texture), 1) as avg_texture,
  round(avg(de.rating_presentation), 1) as avg_presentation,
  round(avg(de.rating_value), 1) as avg_value,
  max(de.visit_date) as last_visited,
  array_agg(de.notes order by de.visit_date desc) filter (where de.notes is not null and de.notes != '') as all_notes
from public.diary_entries de
group by de.user_id, de.restaurant_id, de.item_name, de.item_category;

-- Friends list (accepted only)
create or replace view public.friends as
select
  case when fr.from_user_id = auth.uid() then fr.to_user_id else fr.from_user_id end as friend_id,
  fr.id as request_id,
  fr.created_at as friends_since
from public.friend_requests fr
where fr.status = 'accepted'
  and (fr.from_user_id = auth.uid() or fr.to_user_id = auth.uid());

-- ============================================================
-- REALTIME
-- Enable realtime for session features
-- ============================================================
alter publication supabase_realtime add table public.dining_sessions;
alter publication supabase_realtime add table public.session_participants;
alter publication supabase_realtime add table public.diary_entries;
alter publication supabase_realtime add table public.friend_requests;
