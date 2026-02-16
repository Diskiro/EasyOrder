-- FIX SECURITY WARNINGS & CONSOLIDATE RLS
-- This script resolves "mutable search_path" and "redundant policies" warnings.

-- 1. Fix "mutable search_path" on handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Fix: Explicitly set search_path
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'waiter' -- Default role
  );
  RETURN new;
END;
$$;

-- 2. Consolidate RLS Policies
-- We drop ALL existing policies for these tables to remove duplicates (specific vs "Enable All")
-- Then we recreate a SINGLE set of permissive policies for Authenticated users (Staff).

-- Helper macro-like approach not possible in raw SQL easily, so we repeat for clarity.

-- === ORDERS ===
DROP POLICY IF EXISTS "Authenticated users can select orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.orders;

CREATE POLICY "Staff can manage orders" 
ON public.orders 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === ORDER ITEMS ===
DROP POLICY IF EXISTS "Authenticated users can select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can delete order_items" ON public.order_items;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.order_items;

CREATE POLICY "Staff can manage order_items" 
ON public.order_items 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === TABLES ===
DROP POLICY IF EXISTS "Authenticated users can select tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users can update tables" ON public.tables;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.tables;

CREATE POLICY "Staff can manage tables" 
ON public.tables 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === PRODUCTS ===
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.products;
-- Drop possibly localized ones too just in case
DROP POLICY IF EXISTS "Authenticated users can select products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;

CREATE POLICY "Staff can manage products" 
ON public.products 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === CATEGORIES ===
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can select categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;

CREATE POLICY "Staff can manage categories" 
ON public.categories 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === RESERVATIONS ===
DROP POLICY IF EXISTS "Authenticated users can select reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.reservations;

CREATE POLICY "Staff can manage reservations" 
ON public.reservations 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- === CASH REGISTER ===
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.cash_register_sessions;

CREATE POLICY "Staff can manage cash register" 
ON public.cash_register_sessions 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
