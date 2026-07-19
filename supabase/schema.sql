-- ============================================================
-- FRA — schema Supabase (rulează în SQL Editor din proiectul tău)
-- Multi-user: profiles + roluri, bălți proprii, partide (payload JSONB),
-- clasament opțional, storage pentru poze. Tot accesul e protejat de RLS.
-- Idempotent: se poate rula de mai multe ori fără erori.
-- ============================================================

-- ---------- helper: userul curent e admin? ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ============================================================
-- 1. PROFILES
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user',            -- 'user' | 'admin'
  settings jsonb not null default '{}'::jsonb,   -- baltă implicită, unități, temă, preset-uri montură
  show_on_leaderboard boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- creare automată profil la înregistrare
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ============================================================
-- 2. BĂLȚI proprii (oficialele sunt în client/data.js, cu hărți bundle-uite)
-- ============================================================
create table if not exists public.balti (
  id text primary key,               -- ex: 'u_<uuid>'
  owner_id uuid references auth.users(id) on delete cascade,
  is_official boolean not null default false,
  name text not null,
  location text,
  species jsonb default '[]'::jsonb,
  stand_count int default 0,
  map_url text,
  img_w int, img_h int, hotspot_r int,
  stands jsonb,
  created_at timestamptz not null default now()
);
alter table public.balti enable row level security;

drop policy if exists balti_select on public.balti;
create policy balti_select on public.balti
  for select using (is_official or owner_id = auth.uid() or public.is_admin());
drop policy if exists balti_insert on public.balti;
create policy balti_insert on public.balti
  for insert with check (owner_id = auth.uid() and is_official = false);
drop policy if exists balti_update on public.balti;
create policy balti_update on public.balti
  for update using (owner_id = auth.uid() or public.is_admin());
drop policy if exists balti_delete on public.balti;
create policy balti_delete on public.balti
  for delete using (owner_id = auth.uid() or public.is_admin());

-- ============================================================
-- 3. PARTIDE (payload jsonb = zile / lansete / trăsături)
-- ============================================================
create table if not exists public.partide (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  balta_id text,
  balta_name text,
  stand_no int,
  data_start date,
  data_end date,
  note text,
  payload jsonb not null default '{}'::jsonb,
  capturi int not null default 0,
  total_kg numeric not null default 0,
  record_kg numeric not null default 0,
  deleted boolean not null default false,       -- tombstone pentru sync
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.partide enable row level security;
create index if not exists partide_user_idx on public.partide(user_id);
create index if not exists partide_updated_idx on public.partide(updated_at);

drop policy if exists partide_select on public.partide;
create policy partide_select on public.partide
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists partide_insert on public.partide;
create policy partide_insert on public.partide
  for insert with check (user_id = auth.uid());
drop policy if exists partide_update on public.partide;
create policy partide_update on public.partide
  for update using (user_id = auth.uid());
drop policy if exists partide_delete on public.partide;
create policy partide_delete on public.partide
  for delete using (user_id = auth.uid() or public.is_admin());

-- ============================================================
-- 4. CLASAMENT (doar userii care au optat; agregat, fără detalii private)
-- ============================================================
create or replace function public.leaderboard()
returns table (user_id uuid, display_name text, avatar_url text, capturi bigint, total_kg numeric, record_kg numeric)
language sql stable security definer set search_path = public as $$
  select p.user_id, pr.display_name, pr.avatar_url,
         coalesce(sum(p.capturi), 0)::bigint,
         coalesce(sum(p.total_kg), 0),
         coalesce(max(p.record_kg), 0)
  from public.partide p
  join public.profiles pr on pr.id = p.user_id
  where p.deleted = false and pr.show_on_leaderboard = true
  group by p.user_id, pr.display_name, pr.avatar_url
  order by 6 desc, 5 desc;
$$;

-- ============================================================
-- 5. STORAGE: poze capturi (privat, per user) + hărți (public)
-- ============================================================
insert into storage.buckets (id, name, public) values ('capturi', 'capturi', false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('harti', 'harti', true) on conflict (id) do nothing;

drop policy if exists capturi_read on storage.objects;
create policy capturi_read on storage.objects for select
  using (bucket_id = 'capturi' and (owner = auth.uid() or public.is_admin()));
drop policy if exists capturi_write on storage.objects;
create policy capturi_write on storage.objects for insert
  with check (bucket_id = 'capturi' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists capturi_delete on storage.objects;
create policy capturi_delete on storage.objects for delete
  using (bucket_id = 'capturi' and owner = auth.uid());

drop policy if exists harti_read on storage.objects;
create policy harti_read on storage.objects for select using (bucket_id = 'harti');
drop policy if exists harti_write on storage.objects;
create policy harti_write on storage.objects for insert with check (bucket_id = 'harti' and public.is_admin());

-- ============================================================
-- GATA. Ca să te faci ADMIN, după ce te-ai înregistrat în aplicație:
--   update public.profiles set role = 'admin' where id = (
--     select id from auth.users where email = 'cripetre@gmail.com');
-- ============================================================
