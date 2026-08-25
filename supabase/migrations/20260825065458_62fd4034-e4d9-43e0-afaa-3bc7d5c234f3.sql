-- 1. clients: restrict full row reads to staff, expose safe directory view
DROP POLICY IF EXISTS "Team view clients" ON public.clients;
CREATE POLICY "Staff view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE VIEW public.client_directory
WITH (security_invoker = false) AS
  SELECT id, name, company FROM public.clients;
GRANT SELECT ON public.client_directory TO authenticated;

-- 2. profiles: own profile or staff; safe directory view for team-wide needs
DROP POLICY IF EXISTS "Team can view profiles" ON public.profiles;
CREATE POLICY "View own profile or staff views all" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));

CREATE OR REPLACE VIEW public.team_directory
WITH (security_invoker = false) AS
  SELECT id, full_name, avatar_url, job_title, created_at FROM public.profiles;
GRANT SELECT ON public.team_directory TO authenticated;

-- 3. user_roles: own roles or staff
DROP POLICY IF EXISTS "Team can view roles" ON public.user_roles;
CREATE POLICY "View own roles or staff views all" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

-- 4. transactions: explicit staff-only select policy
DROP POLICY IF EXISTS "Staff view transactions" ON public.transactions;
CREATE POLICY "Staff view transactions" ON public.transactions
  FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- 5. revoke execute on definer trigger function from client roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM authenticated, anon;