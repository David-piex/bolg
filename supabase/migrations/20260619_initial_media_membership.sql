create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_level') then
    create type public.membership_level as enum ('normal', 'gold', 'diamond');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_visibility') then
    create type public.content_visibility as enum ('public', 'normal', 'gold', 'diamond');
  end if;

  if not exists (select 1 from pg_type where typname = 'processing_state') then
    create type public.processing_state as enum ('processing', 'ready');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null,
  level public.membership_level not null default 'normal',
  disabled boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  target_level public.membership_level not null,
  used_by_user_id uuid references public.profiles(id) on delete set null,
  note text,
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  cover_image text,
  visibility public.content_visibility not null default 'public',
  published_at timestamptz not null default now(),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image text,
  default_visibility public.content_visibility not null default 'public',
  published_at timestamptz not null default now(),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  title text not null,
  image_url text not null,
  storage_path text,
  visibility_override public.content_visibility,
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.video_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  cover_image text,
  default_visibility public.content_visibility not null default 'public',
  published_at timestamptz not null default now(),
  created_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.video_collections(id) on delete cascade,
  title text not null,
  description text not null default '',
  cloudinary_public_id text not null,
  playback_url text not null,
  thumbnail_url text,
  visibility_override public.content_visibility,
  processing_state public.processing_state not null default 'processing',
  sort_order integer not null default 1,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
before update on public.posts
for each row execute function public.touch_updated_at();

drop trigger if exists albums_touch_updated_at on public.albums;
create trigger albums_touch_updated_at
before update on public.albums
for each row execute function public.touch_updated_at();

drop trigger if exists video_collections_touch_updated_at on public.video_collections;
create trigger video_collections_touch_updated_at
before update on public.video_collections
for each row execute function public.touch_updated_at();

create or replace function public.visibility_rank(value public.content_visibility)
returns integer
language sql
immutable
as $$
  select case value
    when 'public' then 0
    when 'normal' then 1
    when 'gold' then 2
    when 'diamond' then 3
  end;
$$;

create or replace function public.membership_rank(value public.membership_level)
returns integer
language sql
immutable
as $$
  select case value
    when 'normal' then 1
    when 'gold' then 2
    when 'diamond' then 3
  end;
$$;

create or replace function public.current_user_rank()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when disabled then 0
        when is_admin then 3
        else public.membership_rank(level)
      end
      from public.profiles
      where id = auth.uid()
    ),
    0
  );
$$;

create or replace function public.current_user_can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select is_admin and not disabled
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.can_view_level(required_level public.content_visibility)
returns boolean
language sql
stable
as $$
  select public.visibility_rank(required_level) <= public.current_user_rank();
$$;

create or replace function public.consume_invite_for_user(
  invite_code text,
  profile_user_id uuid,
  profile_email text,
  profile_display_name text
)
returns table(level public.membership_level)
language plpgsql
security definer
set search_path = public
as $$
declare
  matched_invite public.invite_codes%rowtype;
begin
  select *
  into matched_invite
  from public.invite_codes
  where code = upper(trim(invite_code))
  for update;

  if not found or matched_invite.used_by_user_id is not null then
    raise exception 'Invite code is invalid';
  end if;

  insert into public.profiles (id, display_name, email, level, disabled, is_admin)
  values (
    profile_user_id,
    coalesce(nullif(trim(profile_display_name), ''), profile_email),
    lower(trim(profile_email)),
    matched_invite.target_level,
    false,
    false
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      email = excluded.email,
      level = excluded.level,
      disabled = false;

  update public.invite_codes
  set used_by_user_id = profile_user_id,
      used_at = now()
  where id = matched_invite.id
    and used_by_user_id is null;

  if not found then
    raise exception 'Invite code is invalid';
  end if;

  return query
  select matched_invite.target_level;
end;
$$;

alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.posts enable row level security;
alter table public.albums enable row level security;
alter table public.photos enable row level security;
alter table public.video_collections enable row level security;
alter table public.videos enable row level security;

drop policy if exists "profiles can read self or admins read all" on public.profiles;
create policy "profiles can read self or admins read all"
on public.profiles for select
using (id = auth.uid() or public.current_user_can_manage());

drop policy if exists "profiles can update self display name" on public.profiles;
create policy "profiles can update self display name"
on public.profiles for update
using (id = auth.uid())
with check (
  id = auth.uid()
  and level = (select level from public.profiles where id = auth.uid())
  and disabled = (select disabled from public.profiles where id = auth.uid())
  and is_admin = (select is_admin from public.profiles where id = auth.uid())
);

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles"
on public.profiles for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "admins manage invite codes" on public.invite_codes;
create policy "admins manage invite codes"
on public.invite_codes for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "visible posts readable" on public.posts;
create policy "visible posts readable"
on public.posts for select
using (public.can_view_level(visibility));

drop policy if exists "admins manage posts" on public.posts;
create policy "admins manage posts"
on public.posts for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "visible albums readable" on public.albums;
create policy "visible albums readable"
on public.albums for select
using (public.can_view_level(default_visibility));

drop policy if exists "admins manage albums" on public.albums;
create policy "admins manage albums"
on public.albums for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "visible photos readable" on public.photos;
create policy "visible photos readable"
on public.photos for select
using (
  exists (
    select 1
    from public.albums
    where albums.id = photos.album_id
      and public.can_view_level(coalesce(photos.visibility_override, albums.default_visibility))
  )
);

drop policy if exists "admins manage photos" on public.photos;
create policy "admins manage photos"
on public.photos for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "visible video collections readable" on public.video_collections;
create policy "visible video collections readable"
on public.video_collections for select
using (public.can_view_level(default_visibility));

drop policy if exists "admins manage video collections" on public.video_collections;
create policy "admins manage video collections"
on public.video_collections for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

drop policy if exists "visible videos readable" on public.videos;
create policy "visible videos readable"
on public.videos for select
using (
  exists (
    select 1
    from public.video_collections
    where video_collections.id = videos.collection_id
      and public.can_view_level(coalesce(videos.visibility_override, video_collections.default_visibility))
  )
);

drop policy if exists "admins manage videos" on public.videos;
create policy "admins manage videos"
on public.videos for all
using (public.current_user_can_manage())
with check (public.current_user_can_manage());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can read image objects" on storage.objects;
create policy "public can read image objects"
on storage.objects for select
using (bucket_id = 'images');

drop policy if exists "admins manage image objects" on storage.objects;
create policy "admins manage image objects"
on storage.objects for all
using (bucket_id = 'images' and public.current_user_can_manage())
with check (bucket_id = 'images' and public.current_user_can_manage());
