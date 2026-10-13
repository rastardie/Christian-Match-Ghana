-- Create a simple `reports` table for user reports
-- Run this in your Supabase SQL editor (or psql) as a migration

create extension if not exists pgcrypto;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid null,
  target_id text null,
  reason text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_target_id_idx on public.reports (target_id);
