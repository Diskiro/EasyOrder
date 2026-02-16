-- 1. Drop the restrictive policy
drop policy if exists "Users can read own profile" on public.profiles;

-- 2. Create the unified read policy
-- This allows any authenticated user (admin, waiter, kitchen) to see the list of all employees.
-- This is necessary for Staff Management, assigning tables, etc.
create policy "Enable read access for all users"
on public.profiles for select
to authenticated
using (true);

-- 3. Keep update policy restricted (only users can update themselves, or admins can update anyone)
-- (We already have update logic via triggers or separate policies, need to check if we need one for updates)
-- For now, let's ensure admins can update roles.

drop policy if exists "Enable update access for users" on public.profiles;

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id);

create policy "Admins can update all profiles"
on public.profiles for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);
