-- Edvance — Better Auth schema.
--
-- Better Auth owns `user`, `session`, `account`, and `verification`. Locally
-- these were created with the Better Auth CLI; this migration captures the same
-- schema so a fresh database (Specific's managed Postgres) can be provisioned
-- from the repository alone.
--
-- It sorts before 0001_course_data.sql because `course.user_id` references
-- `"user"(id)`. Every statement is idempotent, so applying it to a database
-- whose auth tables already exist (a developer's local machine) is a no-op.

create table if not exists "user" (
  id              text primary key,
  name            text not null,
  email           text not null unique,
  "emailVerified" boolean not null,
  image           text,
  "createdAt"     timestamptz not null default current_timestamp,
  "updatedAt"     timestamptz not null default current_timestamp
);

create table if not exists session (
  id          text primary key,
  "expiresAt" timestamptz not null,
  token       text not null unique,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId"    text not null references "user"(id) on delete cascade
);

create index if not exists "session_userId_idx" on session ("userId");

create table if not exists account (
  id                      text primary key,
  "accountId"             text not null,
  "providerId"            text not null,
  "userId"                text not null references "user"(id) on delete cascade,
  "accessToken"           text,
  "refreshToken"          text,
  "idToken"               text,
  "accessTokenExpiresAt"  timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope                   text,
  password                text,
  "createdAt"             timestamptz not null default current_timestamp,
  "updatedAt"             timestamptz not null
);

create index if not exists "account_userId_idx" on account ("userId");

create table if not exists verification (
  id          text primary key,
  identifier  text not null,
  value       text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default current_timestamp,
  "updatedAt" timestamptz not null default current_timestamp
);

create index if not exists verification_identifier_idx on verification (identifier);
