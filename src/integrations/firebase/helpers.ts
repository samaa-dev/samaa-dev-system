import type { DocumentData, DocumentSnapshot, QueryDocumentSnapshot } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID();
}

export function docToRow<T extends { id: string }>(
  snap: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>,
): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<T, "id">) } as T;
}

export function docsToRows<T extends { id: string }>(
  docs: QueryDocumentSnapshot<DocumentData>[],
): T[] {
  return docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, "id">) }) as T);
}

const ARABIC_PERMISSION =
  "ليس لديك صلاحية لتنفيذ هذا الإجراء. تأكد من دورك أو من قواعد Firestore.";

export function mapFirebaseError(error: unknown): Error {
  if (error instanceof Error && error.name === "EmailNotAllowedError") {
    return error;
  }
  if (error instanceof FirebaseError) {
    if (error.code === "permission-denied") {
      return new Error(ARABIC_PERMISSION);
    }
    return new Error(error.message);
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

export async function withFirebaseError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw mapFirebaseError(e);
  }
}
