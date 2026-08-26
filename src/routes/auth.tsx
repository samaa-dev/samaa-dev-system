import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";

import { SamaaLogo } from "@/components/brand/SamaaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { EmailNotAllowedError, isEmailAllowed } from "@/integrations/firebase/allowlist";
import { getFirebaseAuth } from "@/integrations/firebase/client";
import { ensureUserBootstrap } from "@/integrations/firebase/bootstrap";
import { mapFirebaseError } from "@/integrations/firebase/helpers";
import { useSession } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Samaa Dev" },
      { name: "description", content: "تسجيل دخول فريق Samaa Dev إلى نظام إدارة الوكالة." },
      { property: "og:title", content: "تسجيل الدخول — Samaa Dev" },
      { property: "og:description", content: "دخول أعضاء فريق Samaa Dev إلى نظام الإدارة الداخلي." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const navigate = useNavigate();
  const { data: session, isFetched } = useSession();

  // Only redirect an *existing* allowed session (e.g. refresh). Never during an in-progress sign-in.
  useEffect(() => {
    if (!isFetched || !session || loading) return;

    let cancelled = false;
    setCheckingSession(true);

    void (async () => {
      try {
        const allowed = await isEmailAllowed(session.email);
        if (cancelled) return;
        if (!allowed) {
          await signOut(getFirebaseAuth());
          toast.error(new EmailNotAllowedError().message);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFetched, session, navigate, loading]);

  async function signIn() {
    setLoading(true);
    const auth = getFirebaseAuth();
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);

      const allowed = await isEmailAllowed(result.user.email);
      if (!allowed) {
        await signOut(auth);
        throw new EmailNotAllowedError();
      }

      await ensureUserBootstrap(result.user);
      navigate({ to: "/dashboard", replace: true });
    } catch (e) {
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch {
          /* ignore */
        }
      }
      toast.error(mapFirebaseError(e).message || "تعذّر تسجيل الدخول، حاول مرة أخرى.");
      setLoading(false);
    }
  }

  const busy = loading || checkingSession;

  return (
    <div className="grid-glow relative flex min-h-screen items-center justify-center px-4">
      <div className="absolute start-4 top-4 md:start-6 md:top-6">
        <ThemeToggle />
      </div>
      <div className="panel w-full max-w-md p-8 text-center">
        <SamaaLogo className="mx-auto h-16 w-16" />
        <h1 className="mt-6 text-2xl font-bold">
          Samaa <span className="text-primary">Dev</span>
        </h1>
        <p className="mt-1 text-xs tracking-[0.25em] text-muted-foreground">MANAGEMENT SYSTEM</p>
        <p className="mt-6 text-sm text-muted-foreground">
          الدخول متاح فقط لأعضاء الفريق المصرّح لهم عبر حساب Google.
        </p>
        <Button className="mt-7 w-full" size="lg" onClick={signIn} disabled={busy}>
          {busy ? "جارٍ التحقق…" : "متابعة بحساب Google"}
        </Button>
      </div>
    </div>
  );
}
