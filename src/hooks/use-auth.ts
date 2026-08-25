import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: async (): Promise<Session | null> => {
      const { data } = await supabase.auth.getSession();
      return data.session ?? null;
    },
    staleTime: 30_000,
  });
}

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  roles: string[];
  isStaff: boolean;
  isAdmin: boolean;
};

export function useCurrentUser() {
  const { data: session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: ["auth", "current-user", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!userId) return null;
      const [{ data: profile }, { data: roleRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      const roles = (roleRows ?? []).map((r) => r.role as string);
      return {
        id: userId,
        email: session?.user.email ?? null,
        fullName:
          profile?.full_name ??
          (session?.user.user_metadata?.["full_name"] as string | undefined) ??
          null,
        avatarUrl:
          profile?.avatar_url ??
          (session?.user.user_metadata?.["avatar_url"] as string | undefined) ??
          null,
        jobTitle: profile?.job_title ?? null,
        roles,
        isStaff: roles.includes("admin") || roles.includes("manager"),
        isAdmin: roles.includes("admin"),
      };
    },
  });
}
