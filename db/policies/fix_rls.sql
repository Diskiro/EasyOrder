-- 1. Create Policy for reading profiles
-- Allow users to read their own profile (Critical for AuthContext)
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" 
on public.profiles for select 
to authenticated 
using (auth.uid() = id);

-- 2. Ensure Trigger exists (Just to be double safe)
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 
    'waiter'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 3. Attempt to backfill any missing profiles again
insert into public.profiles (id, email, full_name, role)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', 'Recovered User'), 
  'waiter'
from auth.users
where id not in (select id from public.profiles);
