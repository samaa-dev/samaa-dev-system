import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { SectionOrderDialog } from "@/components/website/SectionOrderDialog";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { ensureSiteDefaults, siteSettingsQuery } from "@/lib/data";
import {
  SITE_CUSTOM_TEMPLATE_HINTS,
  SITE_CUSTOM_TEMPLATE_LABELS,
  SITE_SYSTEM_KEYS,
  SITE_SYSTEM_LABELS,
  SITE_VARIANT_LABELS,
  createCustomSection,
  createSystemSection,
  orderedPageSections,
  sectionDisplayName,
  type SiteCustomTemplate,
  type SitePageSection,
  type SiteSectionItem,
  type SiteSectionVariant,
  type SiteSystemKey,
} from "@/lib/site-sections";
import { uploadSiteMedia } from "@/lib/site-storage";
import {
  LocalizedFieldsTabs,
  LocalizedTextField,
} from "@/components/website/LocalizedFields";
import { emptyLocalized, pick } from "@/lib/i18n/localized";

export const Route = createFileRoute("/_authenticated/website/sections")({
  head: () => ({
    meta: [
      { title: "أقسام الموقع — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteSectionsPage,
});

const CUSTOM_TEMPLATES = Object.keys(SITE_CUSTOM_TEMPLATE_LABELS) as SiteCustomTemplate[];

const CREATIVE_TEMPLATES: SiteCustomTemplate[] = [
  "type_canvas",
  "offset_story",
  "word_ladder",
  "editorial",
  "quote_mosaic",
  "overlay_caption",
];

const CLASSIC_TEMPLATES = CUSTOM_TEMPLATES.filter((t) => !CREATIVE_TEMPLATES.includes(t));

function WebsiteSectionsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const settings = useQuery({ ...siteSettingsQuery(), enabled });

  const [sections, setSections] = useState<SitePageSection[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editing, setEditing] = useState<SitePageSection | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults()
      .then(() => queryClient.invalidateQueries({ queryKey: ["site-settings"] }))
      .catch(() => undefined);
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!settings.data) return;
    setSections(orderedPageSections(settings.data.layout));
  }, [settings.data]);

  const usedSystemKeys = useMemo(
    () =>
      new Set(
        sections
          .filter((s) => s.kind === "system" && s.system_key)
          .map((s) => s.system_key as SiteSystemKey),
      ),
    [sections],
  );

  const saveLayout = useMutation({
    mutationFn: async (next: SitePageSection[]) =>
      withFirebaseError(async () => {
        const normalized = next.map((s, i) => ({ ...s, sort_order: i }));
        await setDoc(doc(getDb(), "site_settings", "layout"), {
          sections: normalized,
          updated_at: nowIso(),
        });
        return normalized;
      }),
    onSuccess: async (normalized) => {
      setSections(normalized);
      setOrderOpen(false);
      setGalleryOpen(false);
      setEditing(null);
      setDeleteId(null);
      toast.success("تم حفظ الأقسام");
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const persist = (next: SitePageSection[]) => {
    const normalized = next.map((s, i) => ({ ...s, sort_order: i }));
    setSections(normalized);
    saveLayout.mutate(normalized);
  };

  const addCustom = (template: SiteCustomTemplate) => {
    const section = createCustomSection(template, { sort_order: sections.length });
    persist([...sections, section]);
    setEditing(section);
  };

  const addSystem = (key: SiteSystemKey) => {
    if (usedSystemKeys.has(key)) {
      toast.error("هذا القسم موجود مسبقاً");
      return;
    }
    persist([...sections, createSystemSection(key, { sort_order: sections.length })]);
  };

  const removeSection = (id: string) => {
    persist(sections.filter((s) => s.id !== id));
  };

  const onUploadImage = async (file: File) => {
    if (!editing) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة صالحة");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadSiteMedia(file, "covers");
      setEditing({ ...editing, image_url: url });
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const updateItem = (index: number, patch: Partial<SiteSectionItem>) => {
    if (!editing) return;
    setEditing({
      ...editing,
      items: editing.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    });
  };

  if (!enabled) {
    return (
      <WebsiteShell title="أقسام الموقع">
        <div />
      </WebsiteShell>
    );
  }

  return (
    <WebsiteShell
      title="أقسام الموقع"
      description="أضف، احذف، رتّب، وعدّل أي قسم. صمّم المحتوى ليناسب شاشة واحدة؛ العناصر الزائدة تُعرض بأسهم التصفح داخل القسم."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setOrderOpen(true)}>
            <ListOrdered className="h-4 w-4" /> ترتيب
          </Button>
          <Button type="button" onClick={() => setGalleryOpen(true)}>
            <Plus className="h-4 w-4" /> إضافة قسم
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        محتوى Hero والخدمات يُعدَّل من{" "}
        <Link to="/website/settings" className="text-primary underline-offset-2 hover:underline">
          الإعدادات
        </Link>
        ، ومعرض الأعمال/الفريق/الآراء من صفحاتها. هنا تبني هيكل الصفحة بحرية.
      </p>

      <div className="space-y-3">
        {sections.map((section, index) => (
          <div
            key={section.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold">{sectionDisplayName(section)}</div>
                <div className="text-xs text-muted-foreground">
                  {section.kind === "custom"
                    ? SITE_CUSTOM_TEMPLATE_LABELS[section.template as SiteCustomTemplate] ||
                      "مخصص"
                    : "قسم نظام"}
                  {section.nav_label ? ` · قائمة: ${pick(section.nav_label, "ar")}` : ""}
                  {!section.visible ? " · مخفي" : ""}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={section.visible ? "default" : "outline"}
                onClick={() =>
                  persist(
                    sections.map((s) =>
                      s.id === section.id ? { ...s, visible: !s.visible } : s,
                    ),
                  )
                }
              >
                {section.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {section.visible ? "ظاهر" : "مخفي"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(section)}>
                <Pencil className="h-4 w-4" /> تعديل
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setDeleteId(section.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {sections.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد أقسام — أضف قسماً من المعرض.
          </p>
        ) : null}
      </div>

      {/* Gallery */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>اختر قالباً لإضافته</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h3 className="mb-2 text-sm font-semibold">إبداع طباعي وتصميم</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {CREATIVE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    className="rounded-xl border border-border p-4 text-start transition hover:border-primary hover:bg-accent/40"
                    onClick={() => addCustom(tpl)}
                  >
                    <div className="font-semibold">{SITE_CUSTOM_TEMPLATE_LABELS[tpl]}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {SITE_CUSTOM_TEMPLATE_HINTS[tpl]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">قوالب أساسية</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {CLASSIC_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    className="rounded-xl border border-border p-4 text-start transition hover:border-primary hover:bg-accent/40"
                    onClick={() => addCustom(tpl)}
                  >
                    <div className="font-semibold">{SITE_CUSTOM_TEMPLATE_LABELS[tpl]}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {SITE_CUSTOM_TEMPLATE_HINTS[tpl]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">أقسام النظام (إن حُذفت)</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {SITE_SYSTEM_KEYS.map((key) => {
                  const used = usedSystemKeys.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={used}
                      className="rounded-xl border border-border p-4 text-start transition hover:border-primary hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => addSystem(key)}
                    >
                      <div className="font-semibold">{SITE_SYSTEM_LABELS[key]}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {used ? "موجود بالفعل" : "إعادة إضافة للصفحة"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              تعديل: {editing ? sectionDisplayName(editing) : ""}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 sm:col-span-2 sm:justify-end">
                <Switch
                  checked={editing.show_in_nav}
                  onCheckedChange={(v) => setEditing({ ...editing, show_in_nav: v })}
                />
                <Label>إظهار في القائمة</Label>
              </div>
              <div className="space-y-1.5">
                <Label>المظهر</Label>
                <Select
                  value={editing.variant}
                  onValueChange={(v) =>
                    setEditing({ ...editing, variant: v as SiteSectionVariant })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SITE_VARIANT_LABELS) as SiteSectionVariant[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {SITE_VARIANT_LABELS[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <LocalizedFieldsTabs>
                {(locale) => (
                  <>
                    <LocalizedTextField
                      locale={locale}
                      label="تسمية القائمة"
                      value={editing.nav_label}
                      onChange={(next) => setEditing({ ...editing, nav_label: next })}
                    />
                    <LocalizedTextField
                      locale={locale}
                      label="العنوان العلوي"
                      value={editing.eyebrow}
                      onChange={(next) => setEditing({ ...editing, eyebrow: next })}
                    />
                    <LocalizedTextField
                      locale={locale}
                      label="العنوان"
                      value={editing.title}
                      onChange={(next) => setEditing({ ...editing, title: next })}
                    />
                    <LocalizedTextField
                      locale={locale}
                      label="الوصف"
                      multiline
                      rows={2}
                      value={editing.subtitle}
                      onChange={(next) => setEditing({ ...editing, subtitle: next })}
                    />
                    {editing.kind === "custom" ? (
                      <>
                        <LocalizedTextField
                          locale={locale}
                          label="النص التفصيلي"
                          multiline
                          rows={4}
                          value={editing.body}
                          onChange={(next) => setEditing({ ...editing, body: next })}
                        />
                        <LocalizedTextField
                          locale={locale}
                          label="نص الزر"
                          value={editing.cta_label}
                          onChange={(next) => setEditing({ ...editing, cta_label: next })}
                        />
                      </>
                    ) : null}
                  </>
                )}
              </LocalizedFieldsTabs>

              {editing.kind === "custom" ? (
                <>
                  <div className="space-y-1.5">
                    <Label>رابط الزر</Label>
                    <Input
                      dir="ltr"
                      value={editing.cta_href}
                      onChange={(e) => setEditing({ ...editing, cta_href: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>صورة القسم</Label>
                    <div className="flex flex-wrap items-center gap-3">
                      {editing.image_url ? (
                        <img
                          src={editing.image_url}
                          alt=""
                          className="h-16 w-24 rounded-lg object-cover"
                        />
                      ) : null}
                      <Button type="button" variant="outline" disabled={uploading} asChild>
                        <label className="cursor-pointer">
                          <Upload className="h-4 w-4" />
                          {uploading ? "جاري الرفع…" : "رفع"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) void onUploadImage(f);
                            }}
                          />
                        </label>
                      </Button>
                      {editing.image_url ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditing({ ...editing, image_url: null })}
                        >
                          إزالة
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {(editing.template === "feature_cards" ||
                    editing.template === "process_steps" ||
                    editing.template === "faq" ||
                    editing.template === "stats_band" ||
                    editing.template === "word_ladder" ||
                    editing.template === "quote_mosaic") && (
                    <div className="space-y-3 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>
                          {editing.template === "word_ladder"
                            ? "الكلمات (من الأصغر للأكبر)"
                            : editing.template === "quote_mosaic"
                              ? "الشذرات النصية"
                              : "العناصر"}
                        </Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const next: SiteSectionItem = {
                              id: `it_${Math.random().toString(36).slice(2, 8)}`,
                              title: emptyLocalized(),
                              description: emptyLocalized(),
                            };
                            if (editing.template === "stats_band") next.value = "";
                            setEditing({
                              ...editing,
                              items: [...editing.items, next],
                            });
                          }}
                        >
                          <Plus className="h-4 w-4" /> عنصر
                        </Button>
                      </div>
                      {editing.items.map((it, i) => (
                        <div key={it.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">#{i + 1}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                setEditing({
                                  ...editing,
                                  items: editing.items.filter((_, j) => j !== i),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <LocalizedFieldsTabs>
                            {(locale) =>
                              editing.template === "stats_band" ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input
                                    placeholder="القيمة"
                                    value={it.value ?? ""}
                                    onChange={(e) => updateItem(i, { value: e.target.value })}
                                  />
                                  <LocalizedTextField
                                    locale={locale}
                                    label="التسمية"
                                    value={it.title}
                                    onChange={(next) => updateItem(i, { title: next })}
                                  />
                                </div>
                              ) : editing.template === "word_ladder" ? (
                                <LocalizedTextField
                                  locale={locale}
                                  label="الكلمة"
                                  value={it.title}
                                  onChange={(next) => updateItem(i, { title: next })}
                                />
                              ) : (
                                <>
                                  <LocalizedTextField
                                    locale={locale}
                                    label="العنوان"
                                    value={it.title}
                                    onChange={(next) => updateItem(i, { title: next })}
                                  />
                                  <LocalizedTextField
                                    locale={locale}
                                    label="الوصف"
                                    multiline
                                    rows={2}
                                    value={it.description}
                                    onChange={(next) => updateItem(i, { description: next })}
                                  />
                                </>
                              )
                            }
                          </LocalizedFieldsTabs>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  هذا قسم نظام — العناوين تظهر فوق المحتوى المرتبط (خدمات، فريق، …). المحتوى التفصيلي
                  من صفحاته الخاصة.
                </p>
              )}

              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={editing.visible}
                  onCheckedChange={(v) => setEditing({ ...editing, visible: v })}
                />
                <Label>ظاهر على الموقع</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              إلغاء
            </Button>
            <Button
              disabled={saveLayout.isPending || !editing}
              onClick={() => {
                if (!editing) return;
                persist(sections.map((s) => (s.id === editing.id ? editing : s)));
              }}
            >
              حفظ القسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SectionOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        sections={sections}
        saving={saveLayout.isPending}
        onApply={(next) => persist(next)}
      />

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف القسم"
        description="سيتم إزالة القسم من الصفحة. يمكنك إعادة إضافته لاحقاً من المعرض."
        onConfirm={() => deleteId && removeSection(deleteId)}
        pending={saveLayout.isPending}
      />
    </WebsiteShell>
  );
}
