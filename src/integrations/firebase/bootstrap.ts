import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User as AuthUser } from "firebase/auth";

import { EmailNotAllowedError, isEmailAllowed } from "./allowlist";
import { getDb } from "./client";
import { nowIso, withFirebaseError } from "./helpers";
import type { AppRole, Profile, UserRoles } from "./types";

/**
 * Ensures profile + role docs exist after Google sign-in.
 * Only emails in `allowed_emails` may proceed.
 * First allowed member becomes admin (via meta/bootstrap sentinel);
 * later members get developer until an admin changes their role.
 */
export async function ensureUserBootstrap(user: AuthUser): Promise<void> {
  await withFirebaseError(async () => {
    if (!(await isEmailAllowed(user.email))) {
      throw new EmailNotAllowedError();
    }

    const profileRef = doc(getDb(), "profiles", user.uid);
    const roleRef = doc(getDb(), "user_roles", user.uid);
    const bootstrapRef = doc(getDb(), "meta", "bootstrap");
    const now = nowIso();

    const [profileSnap, roleSnap] = await Promise.all([getDoc(profileRef), getDoc(roleRef)]);

    if (!profileSnap.exists()) {
      const profile: Omit<Profile, "id"> = {
        full_name: user.displayName ?? null,
        job_title: null,
        avatar_url: user.photoURL ?? null,
        created_at: now,
        updated_at: now,
      };
      await setDoc(profileRef, profile);
    } else {
      await setDoc(
        profileRef,
        {
          full_name: user.displayName ?? profileSnap.data()?.["full_name"] ?? null,
          avatar_url: user.photoURL ?? profileSnap.data()?.["avatar_url"] ?? null,
          updated_at: now,
        },
        { merge: true },
      );
    }

    if (!roleSnap.exists()) {
      const bootstrapSnap = await getDoc(bootstrapRef);
      const isFirst = !bootstrapSnap.exists();
      const roles: AppRole[] = isFirst ? ["admin"] : ["developer"];
      const payload: Omit<UserRoles, "id"> = {
        roles,
        created_at: now,
      };
      await setDoc(roleRef, payload);
      if (isFirst) {
        await setDoc(bootstrapRef, {
          bootstrapped: true,
          first_admin_uid: user.uid,
          created_at: now,
        });
      }
    }
  });
}

export async function getUserRoles(uid: string): Promise<AppRole[]> {
  const snap = await getDoc(doc(getDb(), "user_roles", uid));
  if (!snap.exists()) return [];
  const data = snap.data() as UserRoles;
  return (data.roles ?? []) as AppRole[];
}

export async function getUserProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(getDb(), "profiles", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Profile, "id">) };
}
