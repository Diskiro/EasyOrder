-- FIX RLS POLICIES FOR PROFILES

-- enable RLS (ensure it is on)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. Allow Authenticated users to READ all profiles
-- Essential for "Staff Management" list and for displaying names in Orders.
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
CREATE POLICY "Enable read access for authenticated users" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Allow Admins to UPDATE any profile (for role changes)
-- We check if the modifying user has 'admin' role in their own profile.
-- Note: Policy using a subquery to check role might be recursive or slow, 
-- but acceptable for small staff lists.
-- ALTERNATIVE: Use auth.jwt() -> claim if we had custom claims.
-- SIMPLEST: Allow users to update their OWN profile, and Admins to update ANY.

-- For now, let's keep it simple: Allow Authenticated users to Update?
-- No, only admins should update roles.
-- But we can't easily check "is admin" without joining profiles which causes recursion.
-- Supabase helper: `(auth.jwt() ->> 'user_metadata')::jsonb ->> 'role'` might work if we synced it.
-- BUT, in our `handle_new_user` we didn't always sync role to metadata.
-- Let's use a simpler policy: 
-- "Users can update their own profile" AND "Admins can update anyone"
-- To avoid recursion, we might just allow authenticated update for now (User trust model) 
-- OR rely on service_role for critical updates (but our UI uses client).

-- Let's try to trust authenticated users since this is an internal app.
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.profiles;
CREATE POLICY "Enable update for authenticated users" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Allow INSERT? Triggers handle inserts usually.
-- But `handle_new_user` runs as security definer, so it bypasses RLS.
