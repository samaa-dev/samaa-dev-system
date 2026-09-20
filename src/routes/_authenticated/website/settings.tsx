import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteServiceItem } from "@/integrations/firebase/types";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { ensureSiteDefaults, siteSettingsQuery } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/website/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الموقع — Samaa Dev" },
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

  const [hero, setHero] = useState(settings.data?.hero);
  const [contact, setContact] = useState(settings.data?.contact);
  const [social, setSocial] = useState(settings.data?.social);
  const [about, setAbout] = useState(settings.data?.about);
  const [services, setServices] = useState<SiteServiceItem[]>(
    settings.data?.services.items ?? [],
  );

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults()
      .then(() => queryClient.invalidateQueries({ queryKey: ["site-settings"] }))
      .catch(() => undefined);
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!settings.data) return;
    setHero(settings.data.hero);
    setContact(settings.data.contact);
    setSocial(settings.data.social);
    setAbout(settings.data.about);
    setServices(settings.data.services.items);
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
      <WebsiteShell title="إعدادات الموقع">
        <div />
      </WebsiteShell>
    );
  }

  return (
    <WebsiteShell title="إعدادات الموقع" description="معلومات الشركة والعبارات الظاهرة على الموقع العام">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">القسم الرئيسي (Hero)</h2>
          {(
            [
              { key: "headline", label: "العنوان", long: true },
              { key: "subtitle", label: "الوصف", long: true },
              { key: "cta_label", label: "نص زر التواصل" },
              { key: "projects_count", label: "عدد المشاريع" },
              { key: "satisfaction", label: "رضا العملاء" },
              { key: "experience_years", label: "سنوات الخبرة" },
            ] as const
          ).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>{field.label}</Label>
              {"long" in field && field.long ? (
                <Textarea
                  rows={field.key === "subtitle" ? 3 : 2}
                  value={hero?.[field.key] ?? ""}
                  onChange={(e) =>
                    setHero((prev) => (prev ? { ...prev, [field.key]: e.target.value } : prev))
                  }
                />
              ) : (
                <Input
                  value={hero?.[field.key] ?? ""}
                  onChange={(e) =>
                    setHero((prev) => (prev ? { ...prev, [field.key]: e.target.value } : prev))
                  }
                />
              )}
            </div>
          ))}
          <Button
            disabled={save.isPending || !hero}
            onClick={() => hero && save.mutate({ key: "hero", value: { ...hero } })}
          >
            <Save className="h-4 w-4" /> حفظ Hero
          </Button>
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">التواصل</h2>
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
                value={contact?.[field.key] ?? ""}
                onChange={(e) =>
                  setContact((prev) => (prev ? { ...prev, [field.key]: e.target.value } : prev))
                }
              />
            </div>
          ))}
          <Button
            disabled={save.isPending || !contact}
            onClick={() => contact && save.mutate({ key: "contact", value: { ...contact } })}
          >
            <Save className="h-4 w-4" /> حفظ التواصل
          </Button>
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">السوشيال</h2>
          {(
            [
              { key: "linkedin", label: "LinkedIn" },
              { key: "github", label: "GitHub" },
              { key: "instagram", label: "Instagram" },
              { key: "twitter", label: "Twitter / X" },
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
            disabled={save.isPending || !social}
            onClick={() => social && save.mutate({ key: "social", value: { ...social } })}
          >
            <Save className="h-4 w-4" /> حفظ السوشيال
          </Button>
        </div>

        <div className="panel space-y-4 p-5">
          <h2 className="text-base font-semibold">عن الشركة</h2>
          <div className="space-y-1.5">
            <Label>نص تعريفي</Label>
            <Textarea
              rows={5}
              value={about?.text ?? ""}
              onChange={(e) => setAbout({ text: e.target.value })}
            />
          </div>
          <Button
            disabled={save.isPending || !about}
            onClick={() => about && save.mutate({ key: "about", value: { ...about } })}
          >
            <Save className="h-4 w-4" /> حفظ عن الشركة
          </Button>
        </div>

        <div className="panel space-y-4 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">الخدمات</h2>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setServices((prev) => [
                  ...prev,
                  { title: "", description: "", icon: "sparkles", subtitle: "", tags: [] },
                ])
              }
            >
              <Plus className="h-4 w-4" /> إضافة خدمة
            </Button>
          </div>
          <div className="space-y-4">
            {services.map((item, index) => (
              <div key={index} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-medium text-muted-foreground">خدمة {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setServices((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>العنوان</Label>
                    <Input
                      value={item.title}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>العنوان الفرعي</Label>
                    <Input
                      value={item.subtitle ?? ""}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, subtitle: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>الوصف</Label>
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((s, i) =>
                            i === index ? { ...s, description: e.target.value } : s,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>أيقونة (smartphone / cloud / wand / sparkles)</Label>
                    <Input
                      value={item.icon}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((s, i) => (i === index ? { ...s, icon: e.target.value } : s)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>وسوم (مفصولة بفاصلة)</Label>
                    <Input
                      value={(item.tags ?? []).join("، ")}
                      onChange={(e) =>
                        setServices((prev) =>
                          prev.map((s, i) =>
                            i === index
                              ? {
                                  ...s,
                                  tags: e.target.value
                                    .split(/[،,]/)
                                    .map((t) => t.trim())
                                    .filter(Boolean),
                                }
                              : s,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate({ key: "services", value: { items: services } })}
          >
            <Save className="h-4 w-4" /> حفظ الخدمات
          </Button>
        </div>
      </div>
    </WebsiteShell>
  );
}
