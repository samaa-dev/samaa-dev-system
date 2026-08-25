-- Remove the definer views introduced previously
DROP VIEW IF EXISTS public.client_directory;
DROP VIEW IF EXISTS public.team_directory;

-- 1. Split client sensitive contact info into a staff-only table
CREATE TABLE IF NOT EXISTS public.client_contacts (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  email text,
  phone text,
  notes text,
  satisfaction smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage client contacts" ON public.client_contacts
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.client_contacts (client_id, email, phone, notes, satisfaction)
SELECT id, email, phone, notes, satisfaction FROM public.clients
ON CONFLICT (client_id) DO NOTHING;

ALTER TABLE public.clients
  DROP COLUMN email,
  DROP COLUMN phone,
  DROP COLUMN notes,
  DROP COLUMN satisfaction;

-- clients base table: team may read non-sensitive fields again
DROP POLICY IF EXISTS "Staff view clients" ON public.clients;
CREATE POLICY "Team view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (true);

-- 2. profiles: drop stored email (available from the auth session instead)
ALTER TABLE public.profiles DROP COLUMN email;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE is_first BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO is_first;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN is_first THEN 'admin'::public.app_role ELSE 'developer'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated, anon;

-- profiles readable by self and staff, plus team-wide basic visibility of names/avatars
DROP POLICY IF EXISTS "View own profile or staff views all" ON public.profiles;
CREATE POLICY "Team view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);