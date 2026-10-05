import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { LandingAuditSettings, LandingOption } from "@/integrations/firebase/types";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import {
  ensureLandingAuditDefaults,
  landingAuditSettingsQuery,
} from "@/lib/data";
import { DEFAULT_LANDING_AUDIT } from "@/lib/site-defaults";

export const Route = createFileRoute("/_authenticated/landing/settings")({
  head: () => ({
    meta: [
      { title: "محتوى صفحة الهبوط — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingSettingsPage,
});

function slugifyId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .slice(0, 40);
}

function OptionsEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: LandingOption[];
  onChange: (next: LandingOption[]) => void;
}) {
  const update = (index: number, patch: Partial<LandingOption>) => {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const add = () => {
    const id = `opt_${Date.now().toString(36)}`;
    onChange([...items, { id, short: "خيار جديد", label: "وصف الخيار" }]);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" />
          إضافة
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className="grid gap-2 rounded-xl border border-border/70 bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_1.4fr_auto]"
          >
            <div>
              <Label className="text-xs text-muted-foreground">المعرّف</Label>
              <Input
                value={item.id}
                onChange={(e) => update(index, { id: slugifyId(e.target.value) || item.id })}
                className="mt-1 h-9"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">العنوان القصير</Label>
              <Input
                value={item.short}
                onChange={(e) => update(index, { short: e.target.value })}
                className="mt-1 h-9"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الوصف الكامل</Label>
              <Input
                value={item.label}
                onChange={(e) => update(index, { label: e.target.value })}
                className="mt-1 h-9"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => remove(index)}
                disabled={items.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingSettingsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const settings = useQuery({ ...landingAuditSettingsQuery(), enabled });
  const [draft, setDraft] = useState<LandingAuditSettings | null>(null);

  useEffect(() => {
    if (!enabled) return;
    void ensureLandingAuditDefaults()
      .then((data) => {
        setDraft(data);
        void queryClient.invalidateQueries({ queryKey: ["landing-audit-settings"] });
      })
      .catch(() => undefined);
  }, [enabled, queryClient]);

  useEffect(() => {
    if (settings.data && !draft) setDraft(settings.data);
  }, [settings.data, draft]);

  const save = useMutation({
    mutationFn: async (payload: LandingAuditSettings) =>
      withFirebaseError(async () => {
        const cleaned: LandingAuditSettings = {
          ...payload,
          business_types: payload.business_types.filter((o) => o.id && o.short),
          monthly_volumes: payload.monthly_volumes.filter((o) => o.id && o.short),
          team_sizes: payload.team_sizes.filter((o) => o.id && o.short),
          challenges: payload.challenges.filter((o) => o.id && o.short),
          updated_at: nowIso(),
        };
        await setDoc(doc(getDb(), "site_settings", "landing_audit"), cleaned);
        return cleaned;
      }),
    onSuccess: async (cleaned) => {
      setDraft(cleaned);
      toast.success("تم حفظ محتوى صفحة الهبوط");
      await queryClient.invalidateQueries({ queryKey: ["landing-audit-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const form = draft ?? DEFAULT_LANDING_AUDIT;

  const patch = (partial: Partial<LandingAuditSettings>) => {
    setDraft({ ...form, ...partial });
  };

  return (
    <LandingShell
      title="محتوى الأسئلة"
      description="النصوص والخيارات التي تظهر لزائر صفحة فحص النظام"
      actions={
        <Button
          disabled={save.isPending || !draft}
          onClick={() => draft && save.mutate(draft)}
        >
          حفظ التغييرات
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-4 font-semibold">ترحيب البداية</h3>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="welcome_title">العنوان</Label>
              <Input
                id="welcome_title"
                className="mt-1.5"
                value={form.welcome_title}
                onChange={(e) => patch({ welcome_title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="welcome_subtitle">النص التحفيزي</Label>
              <Input
                id="welcome_subtitle"
                className="mt-1.5"
                value={form.welcome_subtitle}
                onChange={(e) => patch({ welcome_subtitle: e.target.value })}
              />
            </div>
          </div>
        </div>

        <OptionsEditor
          title="أنواع النشاط"
          items={form.business_types}
          onChange={(business_types) => patch({ business_types })}
        />
        <OptionsEditor
          title="حجم المعاملات"
          items={form.monthly_volumes}
          onChange={(monthly_volumes) => patch({ monthly_volumes })}
        />
        <OptionsEditor
          title="حجم الفريق"
          items={form.team_sizes}
          onChange={(team_sizes) => patch({ team_sizes })}
        />
        <OptionsEditor
          title="العوائق"
          items={form.challenges}
          onChange={(challenges) => patch({ challenges })}
        />

        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
          <h3 className="mb-4 font-semibold">عناوين باقي الخطوات</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                ["volume_title", "عنوان حجم المعاملات"],
                ["volume_subtitle", "وصف حجم المعاملات"],
                ["team_title", "عنوان حجم الفريق"],
                ["team_subtitle", "وصف حجم الفريق"],
                ["challenges_title", "عنوان العوائق"],
                ["challenges_subtitle", "وصف العوائق"],
                ["contact_title", "عنوان التواصل"],
                ["contact_subtitle", "وصف التواصل"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  className="mt-1.5"
                  value={form[key]}
                  onChange={(e) => patch({ [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </LandingShell>
  );
}
