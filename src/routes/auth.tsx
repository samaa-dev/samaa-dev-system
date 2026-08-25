import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import logo from "@/assets/samaa-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable/index";
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
  const navigate = useNavigate();
  const { data: session, isFetched } = useSession();

  useEffect(() => {
    if (isFetched && session) navigate({ to: "/dashboard", replace: true });
  }, [isFetched, session, navigate]);

  async function signIn() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("تعذّر تسجيل الدخول، حاول مرة أخرى.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid-glow flex min-h-screen items-center justify-center px-4">
      <div className="panel w-full max-w-md p-8 text-center">
        <img src={logo.url} alt="شعار Samaa Dev" className="mx-auto h-16 w-16 object-contain" />
        <h1 className="mt-6 text-2xl font-bold">
          Samaa <span className="text-primary">Dev</span>
        </h1>
        <p className="mt-1 text-xs tracking-[0.25em] text-muted-foreground">MANAGEMENT SYSTEM</p>
        <p className="mt-6 text-sm text-muted-foreground">
          الدخول متاح لأعضاء فريق الوكالة فقط عبر حساب Google.
        </p>
        <Button className="mt-7 w-full" size="lg" onClick={signIn} disabled={loading}>
          {loading ? "جارٍ التحويل…" : "متابعة بحساب Google"}
        </Button>
      </div>
    </div>
  );
}
