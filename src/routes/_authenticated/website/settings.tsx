import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { ensureSiteDefaults, siteSettingsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/website/settings")({
  head: () => ({
    meta: [
      { title: "التواصل — الموقع — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteSettingsPage,
});

function WebsiteSettingsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const settings = useQuery({ ...siteSettingsQuery(), enabled });

  const [contact, setContact] = useState(settings.data?.contact);
  const [social, setSocial] = useState(settings.data?.social);

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults()
      .then(() => queryClient.invalidateQueries({ queryKey: ["site-settings"] }))
      .catch(() => undefined);
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!settings.data) return;
    setContact(settings.data.contact);
    setSocial(settings.data.social);
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async (payload: { key: string; value: Record<string, unknown> }) =>
      withFirebaseError(async () => {
        await setDoc(doc(getDb(), "site_settings", payload.key), {
          ...payload.value,
          updated_at: nowIso(),
        });
      }),
    onSuccess: async () => {
      toast.success("تم الحفظ");
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!enabled) {
    return (
      <WebsiteShell title="التواصل">
        <div />
      </WebsiteShell>
    );
  }

  return (
    <WebsiteShell
      title="التواصل"
      description="الأرقام والروابط التي يستخدمها الموقع وصفحة الهبوط عند الحاجة."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold">بيانات التواصل</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              واتساب مهم لصفحة الهبوط إن لم يُضبط رقم منفصل هناك.
            </p>
          </div>
          {(
            [
              { key: "email", label: "البريد" },
              { key: "phone", label: "الهاتف" },
              { key: "whatsapp", label: "واتساب (مع رمز الدولة)" },
              { key: "address", label: "العنوان" },
            ] as const
          ).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                dir={field.key === "email" || field.key === "whatsapp" ? "ltr" : undefined}
                value={contact?.[field.key] ?? ""}
                onChange={(e) =>
                  setContact((prev) => (prev ? { ...prev, [field.key]: e.target.value } : prev))
                }
              />
            </div>
          ))}
          <Button
            className="w-full sm:w-auto"
            disabled={save.isPending || !contact}
            onClick={() => contact && save.mutate({ key: "contact", value: { ...contact } })}
          >
            <Save className="h-4 w-4" /> حفظ التواصل
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold">وسائل التواصل</h2>
            <p className="mt-1 text-sm text-muted-foreground">روابط تظهر في تذييل الموقع الرئيسي.</p>
          </div>
          {(
            [
              { key: "linkedin", label: "LinkedIn" },
              { key: "github", label: "GitHub" },
              { key: "instagram", label: "Instagram" },
              { key: "twitter", label: "Twitter / X" },
              { key: "youtube", label: "YouTube" },
            ] as const
          ).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              <Input
                dir="ltr"
                value={social?.[field.key] ?? ""}
                onChange={(e) =>
                  setSocial((prev) => (prev ? { ...prev, [field.key]: e.target.value } : prev))
                }
              />
            </div>
          ))}
          <Button
            className="w-full sm:w-auto"
            disabled={save.isPending || !social}
            onClick={() => social && save.mutate({ key: "social", value: { ...social } })}
          >
            <Save className="h-4 w-4" /> حفظ الروابط
          </Button>
        </div>
      </div>
    </WebsiteShell>
  );
}
