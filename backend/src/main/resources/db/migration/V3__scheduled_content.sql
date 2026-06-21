alter table posts add column if not exists scheduled_at timestamp with time zone;
alter table albums add column if not exists scheduled_at timestamp with time zone;
alter table videos add column if not exists scheduled_at timestamp with time zone;

create index if not exists idx_posts_scheduled on posts(status, scheduled_at);
create index if not exists idx_albums_scheduled on albums(status, scheduled_at);
create index if not exists idx_videos_scheduled on videos(status, scheduled_at);
