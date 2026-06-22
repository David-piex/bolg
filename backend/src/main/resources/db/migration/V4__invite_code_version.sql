alter table invite_codes add column if not exists version bigint not null default 0;
