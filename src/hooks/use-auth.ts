import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { onAuthStateChanged, type User } from "firebase/auth";

import { getFirebaseAuth } from "@/integrations/firebase/client";
import {
  ensureUserBootstrap,
  getUserProfile,
  getUserRoles,
} from "@/integrations/firebase/bootstrap";

/** Resolves once Firebase Auth finishes the first auth check. */
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setReady(true);
    });
  }, []);

  return { user, ready };
}

export function useSession() {
  const { user, ready } = useAuthUser();

  return useQuery({
    queryKey: ["auth", "session", user?.uid ?? "anon"],
    enabled: ready,
    queryFn: async (): Promise<User | null> => user,
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
  const { user, ready } = useAuthUser();
  const userId = user?.uid ?? null;

  return useQuery({
    queryKey: ["auth", "current-user", userId],
    enabled: ready && Boolean(userId),
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!user || !userId) return null;
      await ensureUserBootstrap(user);
      const [profile, roles] = await Promise.all([
        getUserProfile(userId),
        getUserRoles(userId),
      ]);
      return {
        id: userId,
        email: user.email ?? null,
        fullName: profile?.full_name ?? user.displayName ?? null,
        avatarUrl: profile?.avatar_url ?? user.photoURL ?? null,
        jobTitle: profile?.job_title ?? null,
        roles,
        isStaff: roles.includes("admin") || roles.includes("manager"),
        isAdmin: roles.includes("admin"),
      };
    },
  });
}
