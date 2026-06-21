alter table posts add column category varchar(80);
alter table posts add column tags text;

alter table albums add column category varchar(80);
alter table albums add column tags text;

alter table videos add column category varchar(80);
alter table videos add column tags text;

create index idx_posts_category on posts(category);
create index idx_albums_category on albums(category);
create index idx_videos_category on videos(category);
