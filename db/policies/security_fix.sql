-- CRITICAL SECURITY FIX

-- 1. Enable RLS on cash_register_sessions (Fixes the critical warning)
ALTER TABLE public.cash_register_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for Cash Register Sessions
-- Allow authenticated users (waiters, admin) to open/close sessions
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.cash_register_sessions;
CREATE POLICY "Enable all actions for authenticated users" ON public.cash_register_sessions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Ensure Permissions for ORDERS (Fixes the 403 Forbidden error)
DROP POLICY IF EXISTS "Authenticated users can read orders" ON public.orders;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.orders;

CREATE POLICY "Enable all actions for authenticated users" ON public.orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Ensure Permissions for ORDER ITEMS
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Enable all actions for authenticated users" ON public.order_items;

CREATE POLICY "Enable all actions for authenticated users" ON public.order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
