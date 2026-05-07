-- Fix 1: sessions_write — restrict to admin only
drop policy if exists sessions_write on public.sessions;
create policy sessions_write on public.sessions
  for all
  using (
    exists (select 1 from public.teachers where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.teachers where id = auth.uid() and role = 'admin')
  );

-- Fix 2: week constraint — increase ceiling from 14 to 16
alter table public.sessions drop constraint if exists sessions_week_check;
alter table public.sessions add constraint sessions_week_check check (week between 1 and 16);

-- Fix 3: semester column on modules (1 or 2)
alter table public.modules
  add column if not exists semester smallint not null default 1
  check (semester in (1, 2));

-- Backfill semester from module_code (YxS2-* → 2, everything else → 1)
update public.modules
set semester = 2
where module_code ~ 'S2';
