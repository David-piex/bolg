create table users (
  id uuid primary key,
  username varchar(64) not null unique,
  email varchar(255) not null unique,
  password_hash varchar(255) not null,
  display_name varchar(120) not null,
  role varchar(32) not null,
  member_level varchar(32) not null,
  status varchar(32) not null,
  avatar_url text,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

create table invite_codes (
  id uuid primary key,
  code varchar(64) not null unique,
  initial_level varchar(32) not null,
  max_uses integer not null,
  used_count integer not null default 0,
  expires_at timestamp with time zone,
  status varchar(32) not null,
  created_by uuid references users(id),
  created_at timestamp with time zone not null
);

create table media_assets (
  id uuid primary key,
  media_type varchar(32) not null,
  bucket_name varchar(120) not null,
  object_key text not null,
  original_name text not null,
  mime_type varchar(160) not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds integer,
  cover_object_key text,
  uploaded_by uuid references users(id),
  created_at timestamp with time zone not null
);

create table posts (
  id uuid primary key,
  title varchar(240) not null,
  content text not null,
  visibility varchar(32) not null,
  status varchar(32) not null,
  is_pinned boolean not null default false,
  author_id uuid not null references users(id),
  published_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

create table post_media (
  id uuid primary key,
  post_id uuid not null references posts(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id),
  sort_order integer not null
);

create table albums (
  id uuid primary key,
  title varchar(240) not null,
  description text not null,
  visibility varchar(32) not null,
  cover_media_id uuid references media_assets(id),
  status varchar(32) not null,
  author_id uuid not null references users(id),
  published_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

create table album_items (
  id uuid primary key,
  album_id uuid not null references albums(id) on delete cascade,
  media_asset_id uuid not null references media_assets(id),
  sort_order integer not null
);

create table videos (
  id uuid primary key,
  title varchar(240) not null,
  description text not null,
  visibility varchar(32) not null,
  media_asset_id uuid not null references media_assets(id),
  cover_media_id uuid references media_assets(id),
  status varchar(32) not null,
  author_id uuid not null references users(id),
  published_at timestamp with time zone,
  created_at timestamp with time zone not null,
  updated_at timestamp with time zone not null
);

create table admin_audit_logs (
  id uuid primary key,
  admin_user_id uuid not null references users(id),
  action_type varchar(80) not null,
  target_type varchar(80) not null,
  target_id uuid,
  detail_json text not null,
  created_at timestamp with time zone not null
);

create index idx_posts_feed on posts(status, visibility, published_at desc);
create index idx_albums_feed on albums(status, visibility, published_at desc);
create index idx_videos_feed on videos(status, visibility, published_at desc);
create index idx_media_uploaded_by on media_assets(uploaded_by, created_at desc);
create index idx_audit_admin_time on admin_audit_logs(admin_user_id, created_at desc);
