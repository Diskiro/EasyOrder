-- COMPREHENSIVE FIX SCRIPT
-- Run this entire script in the Supabase SQL Editor to fix "Profile missing" errors

BEGIN;

-- 1. FIX RLS POLICIES (Allow users to read their own profile)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. UPDATE TRIGGER (Ensure new users get a profile with ROLE)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 
    -- Default to 'waiter' if no role is specified, otherwise cast the role
    COALESCE((new.raw_user_meta_data->>'role')::text, 'waiter')::public.user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger just in case
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. BACKFILL MISSING PROFILES (The most critical part for your error)
-- This finds any user in auth.users that DOES NOT have a row in public.profiles and creates it
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', 'Recovered User'), 
  'waiter' -- Default role for recovered users
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

COMMIT;

-- 4. VERIFY
SELECT count(*) as "Total Profiles" FROM public.profiles;
