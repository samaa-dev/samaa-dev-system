import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import {
  LocalizedFieldsTabs,
  LocalizedTextField,
} from "@/components/website/LocalizedFields";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
import { StatusBadge } from "@/components/StatusBadge";
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
import type { SiteImpactMetric, SiteProject } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import {
  categoryLabel,
  ensureSiteDefaults,
  siteCategoriesQuery,
  siteProjectsAdminQuery,
} from "@/lib/data";
import { SITE_PROJECT_STATUS_LABELS } from "@/lib/site-defaults";
import { uploadSiteMedia } from "@/lib/site-storage";
import {
  asLocalized,
  emptyLocalized,
  trimLocalized,
  type LocalizedString,
} from "@/lib/i18n/localized";
import { textOf } from "@/lib/site-localize";

export const Route = createFileRoute("/_authenticated/website/projects")({
  head: () => ({
    meta: [
      { title: "مشاريع المعرض — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteProjectsPage,
});

type FormState = {
  id?: string;
  title: LocalizedString;
  slug: string;
  category: string;
  short_description: LocalizedString;
  detailed_description: LocalizedString;
  tech_stack: string;
  cover_image_url: string | null;
  gallery_urls: string[];
  impact_metrics: SiteImpactMetric[];
  live_url: string;
  playstore_url: string;
  appstore_url: string;
  is_featured: boolean;
  status: "published" | "draft";
  sort_order: number;
};

function emptyForm(category: string): FormState {
  return {
    title: emptyLocalized(),
    slug: "",
    category,
    short_description: emptyLocalized(),
    detailed_description: emptyLocalized(),
    tech_stack: "",
    cover_image_url: null,
    gallery_urls: [],
    impact_metrics: [],
    live_url: "",
    playstore_url: "",
    appstore_url: "",
    is_featured: false,
    status: "draft",
    sort_order: 0,
  };
}

function toForm(p: SiteProject): FormState {
  return {
    id: p.id,
    title: asLocalized(p.title),
    slug: p.slug,
    category: p.category,
    short_description: asLocalized(p.short_description),
    detailed_description: asLocalized(p.detailed_description),
    tech_stack: p.tech_stack.join("، "),
    cover_image_url: p.cover_image_url,
    gallery_urls: p.gallery_urls ?? [],
    impact_metrics: p.impact_metrics ?? [],
    live_url: p.live_url ?? "",
    playstore_url: p.playstore_url ?? "",
    appstore_url: p.appstore_url ?? "",
    is_featured: p.is_featured,
    status: p.status,
    sort_order: p.sort_order ?? 0,
  };
}

function WebsiteProjectsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const projects = useQuery({ ...siteProjectsAdminQuery(), enabled });
  const categories = useQuery({ ...siteCategoriesQuery(), enabled });
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults()
      .then(() => queryClient.invalidateQueries({ queryKey: ["site-categories"] }))
      .catch(() => undefined);
  }, [enabled, queryClient]);

  const defaultCategory = categories.data?.[0]?.slug ?? "web";

  const save = useMutation({
    mutationFn: async (state: FormState) =>
      withFirebaseError(async () => {
        const now = nowIso();
        const id = state.id ?? newId();
        const title = trimLocalized(state.title);
        const titleAr = title.ar || title.en || title.fr;
        if (!titleAr) throw new Error("عنوان المشروع مطلوب");
        const payload = {
          title,
          slug:
            state.slug.trim() ||
            titleAr.replace(/\s+/g, "-").toLowerCase().slice(0, 60),
          category: state.category,
          short_description: trimLocalized(state.short_description),
          detailed_description: trimLocalized(state.detailed_description),
          tech_stack: state.tech_stack
            .split(/[،,]/)
            .map((t) => t.trim())
            .filter(Boolean),
          cover_image_url: state.cover_image_url,
          gallery_urls: state.gallery_urls,
          impact_metrics: state.impact_metrics.filter((m) => textOf(asLocalized(m.label)) && m.value),
          live_url: state.live_url.trim() || null,
          playstore_url: state.playstore_url.trim() || null,
          appstore_url: state.appstore_url.trim() || null,
          is_featured: state.is_featured,
          status: state.status,
          sort_order: Number(state.sort_order) || 0,
          updated_at: now,
          ...(state.id
            ? {}
            : {
                created_at: now,
                client_name: emptyLocalized(),
                challenge: emptyLocalized(),
                solution: emptyLocalized(),
                results: emptyLocalized(),
                timeline: emptyLocalized(),
              }),
        };
        if (state.id) {
          await updateDoc(doc(getDb(), "site_projects", id), payload);
        } else {
          await setDoc(doc(getDb(), "site_projects", id), payload);
        }
      }),
    onSuccess: async () => {
      toast.success("تم حفظ المشروع");
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["site-projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_projects", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-projects"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUploadCover = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة صالحة");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadSiteMedia(file, "covers");
      setForm((prev) => (prev ? { ...prev, cover_image_url: url } : prev));
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <WebsiteShell
      title="مشاريع المعرض"
      description="مشاريع عامة تظهر على الموقع — منفصلة عن مشاريع التشغيل"
      actions={
        enabled ? (
          <Button onClick={() => setForm(emptyForm(defaultCategory))}>
            <Plus className="h-4 w-4" /> مشروع جديد
          </Button>
        ) : undefined
      }
    >
      <DataTable
        rows={projects.data ?? []}
        searchPlaceholder="ابحث عن مشروع…"
        emptyState="لا توجد مشاريع معرض بعد."
        columns={[
          {
            key: "title",
            header: "المشروع",
            value: (p: SiteProject) => textOf(p.title),
            cell: (p: SiteProject) => (
              <div className="flex items-center gap-3">
                {p.cover_image_url ? (
                  <img
                    src={p.cover_image_url}
                    alt=""
                    className="h-10 w-14 rounded-md object-cover"
                  />
                ) : null}
                <div>
                  <div className="font-medium">{textOf(p.title)}</div>
                  <div className="text-xs text-muted-foreground">
                    {categoryLabel(categories.data, p.category)}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: "الحالة",
            value: (p: SiteProject) => p.status,
            cell: (p: SiteProject) => (
              <StatusBadge tone={p.status === "published" ? "success" : "warning"}>
                {SITE_PROJECT_STATUS_LABELS[p.status] ?? p.status}
              </StatusBadge>
            ),
          },
          {
            key: "featured",
            header: "مميز",
            value: (p: SiteProject) => (p.is_featured ? "نعم" : "لا"),
            cell: (p: SiteProject) => (p.is_featured ? "نعم" : "—"),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (p: SiteProject) => (
              <RowActions
                onEdit={() => setForm(toForm(p))}
                onDelete={() => setDeleteId(p.id)}
              />
            ),
          },
        ]}
      />

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل مشروع" : "مشروع معرض جديد"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <LocalizedFieldsTabs>
                  {(locale) => (
                    <div className="space-y-3">
                      <LocalizedTextField
                        label="العنوان"
                        locale={locale}
                        value={form.title}
                        onChange={(title) => setForm({ ...form, title })}
                      />
                      <LocalizedTextField
                        label="وصف مختصر"
                        locale={locale}
                        multiline
                        rows={2}
                        value={form.short_description}
                        onChange={(short_description) => setForm({ ...form, short_description })}
                      />
                      <LocalizedTextField
                        label="وصف تفصيلي"
                        locale={locale}
                        multiline
                        rows={4}
                        value={form.detailed_description}
                        onChange={(detailed_description) =>
                          setForm({ ...form, detailed_description })
                        }
                      />
                    </div>
                  )}
                </LocalizedFieldsTabs>
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>التصنيف</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.slug}>
                        {textOf(asLocalized(c.label))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>التقنيات (مفصولة بفاصلة)</Label>
                <Input
                  value={form.tech_stack}
                  onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>صورة الغلاف</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {form.cover_image_url ? (
                    <img
                      src={form.cover_image_url}
                      alt=""
                      className="h-16 w-24 rounded-md object-cover"
                    />
                  ) : null}
                  <Button type="button" variant="outline" disabled={uploading} asChild>
                    <label className="cursor-pointer">
                      <Upload className="h-4 w-4" />
                      {uploading ? "جاري الرفع…" : "رفع صورة"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onUploadCover(f);
                        }}
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>رابط مباشر</Label>
                <Input
                  dir="ltr"
                  value={form.live_url}
                  onChange={(e) => setForm({ ...form, live_url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Play Store</Label>
                <Input
                  dir="ltr"
                  value={form.playstore_url}
                  onChange={(e) => setForm({ ...form, playstore_url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>App Store</Label>
                <Input
                  dir="ltr"
                  value={form.appstore_url}
                  onChange={(e) => setForm({ ...form, appstore_url: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ترتيب العرض</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as "published" | "draft" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">مسودة</SelectItem>
                    <SelectItem value="published">منشور</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
                />
                <Label>مشروع مميز</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              disabled={save.isPending || !textOf(form?.title)}
              onClick={() => form && save.mutate(form)}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف مشروع المعرض"
        description="هل أنت متأكد من حذف هذا المشروع من الموقع العام؟"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </WebsiteShell>
  );
}
