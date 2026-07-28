-- 셀카피 schema (Supabase SQL Editor에서 실행)

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'starter', 'pro')),
  plan_expires_at timestamptz,
  credits integer not null default 0,
  monthly_used integer not null default 0,
  monthly_reset_at timestamptz not null default now(),
  free_used_date date,
  free_used_count integer not null default 0,
  brand_tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  platform text not null default 'smartstore',
  product_name text not null,
  category text,
  keywords text,
  selling_points text,
  image_note text,
  result jsonb not null,
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id text not null unique,
  payment_key text,
  product_code text not null,
  amount integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'canceled')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generations_user_id_created_at_idx
  on public.generations (user_id, created_at desc);

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.generations enable row level security;
alter table public.payments enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "generations_select_own"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "generations_insert_own"
  on public.generations for insert
  with check (auth.uid() = user_id);

create policy "payments_select_own"
  on public.payments for select
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
