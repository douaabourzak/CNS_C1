-- 1. Fix semester to be year-relative:
--    odd global semester number (S1, S3, S5, S7…) → semester 1 of that year
--    even global semester number (S2, S4, S6, S8…) → semester 2 of that year
update public.modules
set semester = case
  when (regexp_match(module_code, 'S(\d+)'))[1]::int % 2 = 0 then 2
  else 1
end
where module_code ~ 'S\d+';

-- 2. Add "both" to the teacher_role enum (person is lecturer + teacher simultaneously)
alter type teacher_role add value if not exists 'both';

-- 3. Update auth trigger to honour the "both" role choice at signup
create or replace function public.tg_handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role teacher_role;
begin
  _role := case
    when new.raw_user_meta_data->>'role' = 'lecturer' then 'lecturer'::teacher_role
    when new.raw_user_meta_data->>'role' = 'both'     then 'both'::teacher_role
    else 'teacher'::teacher_role
  end;
  insert into public.teachers (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    _role
  )
  on conflict (id) do nothing;
  return new;
end $$;
