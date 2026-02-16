-- 1. Check if the trigger exists (You should see 'on_auth_user_created' in the output of a query like this in dashboard, but here we just re-create it to be sure)

-- Drop trigger if exists to ensure clean state
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Re-create the function
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

-- 3. Re-create the trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. EMERGENCY FIX: Insert profiles for existing users that are missing them
insert into public.profiles (id, email, full_name, role)
select 
  id, 
  email, 
  coalesce(raw_user_meta_data->>'full_name', 'Recovered User'), 
  'waiter'
from auth.users
where id not in (select id from public.profiles);
