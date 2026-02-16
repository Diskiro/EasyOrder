-- Update the trigger function to read the 'role' from metadata
-- This allows users to be created with 'admin', 'kitchen', or 'waiter' roles directly.

create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 
    -- Read role from metadata, default to 'waiter' if invalid or missing
    coalesce(new.raw_user_meta_data->>'role', 'waiter')::public.user_role
  );
  return new;
end;
$$ language plpgsql security definer;
