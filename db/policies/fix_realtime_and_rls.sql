-- 1. Enable Realtime for critical tables
-- This ensures Supabase broadcasts 'postgres_changes' events for these tables
begin;
  -- Try to add tables to publication. 
  -- ('drop publication' is extreme, better to just alter)
  alter publication supabase_realtime add table public.orders;
  alter publication supabase_realtime add table public.order_items;
  alter publication supabase_realtime add table public.tables;
commit;

-- 2. Fix RLS Policies for Orders and Items
-- If RLS is enabled but user can't SELECT, they won't receive Realtime events either.

-- Enable RLS (just in case)
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Drop existing policies to ensure clean slate (ignore errors if they don't exist)
drop policy if exists "Authenticated users can select orders" on public.orders;
drop policy if exists "Authenticated users can insert orders" on public.orders;
drop policy if exists "Authenticated users can update orders" on public.orders;
drop policy if exists "Authenticated users can delete orders" on public.orders;

drop policy if exists "Authenticated users can select order_items" on public.order_items;
drop policy if exists "Authenticated users can insert order_items" on public.order_items;
drop policy if exists "Authenticated users can update order_items" on public.order_items;
drop policy if exists "Authenticated users can delete order_items" on public.order_items;

-- Create Permissive Policies for Authenticated Users (Admins, Waiters, Kitchen)
-- Note: In a stricter prod environment, you might restrict updates, but for Realtime to work, 
-- they MUST be able to SELECT the new rows.

-- ORDERS
create policy "Authenticated users can select orders" 
on public.orders for select 
to authenticated 
using (true);

create policy "Authenticated users can insert orders" 
on public.orders for insert 
to authenticated 
with check (true);

create policy "Authenticated users can update orders" 
on public.orders for update 
to authenticated 
using (true);

create policy "Authenticated users can delete orders" 
on public.orders for delete 
to authenticated 
using (true);

-- ORDER ITEMS
create policy "Authenticated users can select order_items" 
on public.order_items for select 
to authenticated 
using (true);

create policy "Authenticated users can insert order_items" 
on public.order_items for insert 
to authenticated 
with check (true);

create policy "Authenticated users can update order_items" 
on public.order_items for update 
to authenticated 
using (true);

create policy "Authenticated users can delete order_items" 
on public.order_items for delete 
to authenticated 
using (true);

-- TABLES (Ensure mostly public read/write for status updates)
drop policy if exists "Authenticated users can select tables" on public.tables;
drop policy if exists "Authenticated users can update tables" on public.tables;

create policy "Authenticated users can select tables" 
on public.tables for select 
to authenticated 
using (true);

create policy "Authenticated users can update tables" 
on public.tables for update 
to authenticated 
using (true);
