import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

function readConfig() {
  const apiKey = import.meta.env["VITE_FIREBASE_API_KEY"] as string | undefined;
  const authDomain = import.meta.env["VITE_FIREBASE_AUTH_DOMAIN"] as string | undefined;
  const projectId = import.meta.env["VITE_FIREBASE_PROJECT_ID"] as string | undefined;
  const storageBucket = import.meta.env["VITE_FIREBASE_STORAGE_BUCKET"] as string | undefined;
  const messagingSenderId = import.meta.env["VITE_FIREBASE_MESSAGING_SENDER_ID"] as string | undefined;
  const appId = import.meta.env["VITE_FIREBASE_APP_ID"] as string | undefined;

  const missing = [
    !apiKey && "VITE_FIREBASE_API_KEY",
    !authDomain && "VITE_FIREBASE_AUTH_DOMAIN",
    !projectId && "VITE_FIREBASE_PROJECT_ID",
    !storageBucket && "VITE_FIREBASE_STORAGE_BUCKET",
    !messagingSenderId && "VITE_FIREBASE_MESSAGING_SENDER_ID",
    !appId && "VITE_FIREBASE_APP_ID",
  ].filter(Boolean);

  if (missing.length) {
    throw new Error(
      `Missing Firebase environment variable(s): ${missing.join(", ")}. Fill .env from Firebase Console.`,
    );
  }

  return {
    apiKey: apiKey!,
    authDomain: authDomain!,
    projectId: projectId!,
    storageBucket: storageBucket!,
    messagingSenderId: messagingSenderId!,
    appId: appId!,
  };
}

function getFirebaseApp(): FirebaseApp {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp(readConfig());
}

let _auth: Auth | undefined;
let _db: Firestore | undefined;

/** Real Auth instance — required by Firebase SDK (do not wrap in Proxy). */
export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

/** Real Firestore instance — required by doc()/collection() (do not wrap in Proxy). */
export function getDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}
