import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

import { getDb } from "./client";
import { nowIso, withFirebaseError } from "./helpers";

export type AllowedEmail = {
  email: string;
  created_at: string;
  created_by: string | null;
  note: string | null;
};

/** Normalize email for allowlist document IDs. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

/**
 * Returns true if the email exists in `allowed_emails/{email}`.
 */
export async function isEmailAllowed(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  const id = normalizeEmail(email);
  const snap = await getDoc(doc(getDb(), "allowed_emails", id));
  return snap.exists();
}

export async function listAllowedEmails(): Promise<AllowedEmail[]> {
  return withFirebaseError(async () => {
    const snap = await getDocs(collection(getDb(), "allowed_emails"));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          email: d.id,
          created_at: (data["created_at"] as string) ?? "",
          created_by: (data["created_by"] as string | null) ?? null,
          note: (data["note"] as string | null) ?? null,
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

export async function addAllowedEmail(input: {
  email: string;
  createdBy: string | null;
  note?: string;
}): Promise<void> {
  return withFirebaseError(async () => {
    const id = normalizeEmail(input.email);
    if (!isValidEmail(id)) {
      throw new Error("صيغة البريد الإلكتروني غير صحيحة.");
    }
    const ref = doc(getDb(), "allowed_emails", id);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      throw new Error("هذا البريد موجود مسبقاً في القائمة.");
    }
    await setDoc(ref, {
      created_at: nowIso(),
      created_by: input.createdBy,
      note: input.note?.trim() || null,
    });
  });
}

export async function removeAllowedEmail(email: string): Promise<void> {
  return withFirebaseError(async () => {
    await deleteDoc(doc(getDb(), "allowed_emails", normalizeEmail(email)));
  });
}

export class EmailNotAllowedError extends Error {
  constructor() {
    super("هذا البريد غير مصرّح له بالدخول. تواصل مع مدير النظام لإضافتك.");
    this.name = "EmailNotAllowedError";
  }
}
