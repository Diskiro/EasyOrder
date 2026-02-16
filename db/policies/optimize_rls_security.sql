-- OPTIMIZE RLS SECURITY (RBAC)
-- This script replaces "permissive" policies with "role-based" policies.
-- It resolves the warnings about "unrestricted access" by ensuring we actually check the user's role.

-- Helper function to get current user role
-- (Optional but makes policies cleaner. If performance is key, we might inline it, but for this scale function is fine)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. ORDERS
DROP POLICY IF EXISTS "Staff can manage orders" ON public.orders;

-- Read: All staff
CREATE POLICY "Staff can view orders" ON public.orders
FOR SELECT TO authenticated
USING (true); -- Read is fine for all staff

-- Insert: Waiters and Admins
CREATE POLICY "Waiters and Admins can create orders" ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  public.get_my_role() IN ('admin', 'waiter')
);

-- Update: All staff (Kitchen needs to update status, Waiters need to update items/pay)
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE TO authenticated
USING (
  public.get_my_role() IN ('admin', 'waiter', 'kitchen')
)
WITH CHECK (
  public.get_my_role() IN ('admin', 'waiter', 'kitchen')
);

-- Delete: Admins only (Soft delete preferred usually, but for now strict delete)
CREATE POLICY "Admins can delete orders" ON public.orders
FOR DELETE TO authenticated
USING (
  public.get_my_role() = 'admin'
);


-- 2. ORDER ITEMS
DROP POLICY IF EXISTS "Staff can manage order_items" ON public.order_items;

CREATE POLICY "Staff can view order items" ON public.order_items
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Waiters and Admins can manage order items" ON public.order_items
FOR ALL TO authenticated
USING (
    public.get_my_role() IN ('admin', 'waiter')
)
WITH CHECK (
    public.get_my_role() IN ('admin', 'waiter')
);
-- Kitchen technically only reads items to cook them, rarely modifies them directly unless marking specific item?
-- For now, allow Kitchen read-only on items, Waiters/Admin full control.


-- 3. TABLES
DROP POLICY IF EXISTS "Staff can manage tables" ON public.tables;

CREATE POLICY "Staff can view tables" ON public.tables
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can update table status" ON public.tables
FOR UPDATE TO authenticated
USING (
    public.get_my_role() IN ('admin', 'waiter', 'kitchen')
)
WITH CHECK (
    public.get_my_role() IN ('admin', 'waiter', 'kitchen')
); 
-- Admin can add/remove tables?
CREATE POLICY "Admins can insert/delete tables" ON public.tables
FOR INSERT TO authenticated
WITH CHECK ( public.get_my_role() = 'admin' );

CREATE POLICY "Admins can delete tables" ON public.tables
FOR DELETE TO authenticated
USING ( public.get_my_role() = 'admin' );


-- 4. PRODUCTS & CATEGORIES
DROP POLICY IF EXISTS "Staff can manage products" ON public.products;
DROP POLICY IF EXISTS "Staff can manage categories" ON public.categories;

-- Read: Everyone (even anon potentially if we had a public menu, but for now authenticated)
CREATE POLICY "Staff can view menu" ON public.products
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can view categories" ON public.categories
FOR SELECT TO authenticated USING (true);

-- Write: Admin Only
CREATE POLICY "Admins can manage menu" ON public.products
FOR ALL TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');


-- 5. RESERVATIONS
DROP POLICY IF EXISTS "Staff can manage reservations" ON public.reservations;

-- Read: All staff
CREATE POLICY "Staff can view reservations" ON public.reservations
FOR SELECT TO authenticated USING (true);

-- Write: Waiters and Admins
CREATE POLICY "Waiters and Admins can manage reservations" ON public.reservations
FOR ALL TO authenticated
USING (public.get_my_role() IN ('admin', 'waiter'))
WITH CHECK (public.get_my_role() IN ('admin', 'waiter'));


-- 6. CASH REGISTER
DROP POLICY IF EXISTS "Staff can manage cash register" ON public.cash_register_sessions;

-- Read: Admin (maybe waiter sees their own?)
CREATE POLICY "Admins view all cash sessions" ON public.cash_register_sessions
FOR SELECT TO authenticated
USING (public.get_my_role() = 'admin' OR opened_by = auth.uid());

-- Insert: Waiter/Admin opens shift
CREATE POLICY "Staff can open sessions" ON public.cash_register_sessions
FOR INSERT TO authenticated
WITH CHECK ( public.get_my_role() IN ('admin', 'waiter') );

-- Update: Waiter updates their own, Admin updates any
CREATE POLICY "Staff can close own sessions" ON public.cash_register_sessions
FOR UPDATE TO authenticated
USING ( (public.get_my_role() = 'admin') OR (opened_by = auth.uid()) )
WITH CHECK ( (public.get_my_role() = 'admin') OR (opened_by = auth.uid()) );
