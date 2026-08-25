import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { isEmailAllowed } from "@/integrations/firebase/allowlist";
import { getFirebaseAuth } from "@/integrations/firebase/client";

function waitForAuthUser() {
  return new Promise<import("firebase/auth").User | null>((resolve) => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (user) => {
      unsub();
      resolve(user);
    });
  });
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const auth = getFirebaseAuth();
    const user = auth.currentUser ?? (await waitForAuthUser());
    if (!user) throw redirect({ to: "/auth" });

    // Hard gate: never enter protected routes without allowlist approval.
    const allowed = await isEmailAllowed(user.email);
    if (!allowed) {
      await signOut(auth);
      throw redirect({ to: "/auth" });
    }

    return { user };
  },
  component: () => <Outlet />,
});
