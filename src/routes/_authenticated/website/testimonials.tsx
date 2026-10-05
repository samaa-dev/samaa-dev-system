import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
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
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteTestimonial } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { siteTestimonialsAdminQuery } from "@/lib/data";
import { uploadSiteMedia } from "@/lib/site-storage";
import { asLocalized, emptyLocalized, trimLocalized, type LocalizedString } from "@/lib/i18n/localized";
import { textOf } from "@/lib/site-localize";
import {
  LocalizedFieldsTabs,
  LocalizedTextField,
} from "@/components/website/LocalizedFields";

export const Route = createFileRoute("/_authenticated/website/testimonials")({
  head: () => ({
    meta: [
      { title: "الآراء والعبارات — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteTestimonialsPage,
});

type FormState = {
  id?: string;
  client_name: LocalizedString;
  client_role: LocalizedString;
  company_name: LocalizedString;
  avatar_url: string | null;
  quote_text: LocalizedString;
  rating: number;
  is_visible: boolean;
  sort_order: number;
};

function emptyForm(): FormState {
  return {
    client_name: emptyLocalized(),
    client_role: emptyLocalized(),
    company_name: emptyLocalized(),
    avatar_url: null,
    quote_text: emptyLocalized(),
    rating: 5,
    is_visible: true,
    sort_order: 0,
  };
}

function toForm(t: SiteTestimonial): FormState {
  return {
    id: t.id,
    client_name: asLocalized(t.client_name),
    client_role: asLocalized(t.client_role),
    company_name: asLocalized(t.company_name),
    avatar_url: t.avatar_url,
    quote_text: asLocalized(t.quote_text),
    rating: t.rating,
    is_visible: t.is_visible,
    sort_order: t.sort_order ?? 0,
  };
}

function WebsiteTestimonialsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const testimonials = useQuery({ ...siteTestimonialsAdminQuery(), enabled });
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async (state: FormState) =>
      withFirebaseError(async () => {
        const now = nowIso();
        const id = state.id ?? newId();
        const payload = {
          client_name: trimLocalized(state.client_name),
          client_role: trimLocalized(state.client_role),
          company_name: trimLocalized(state.company_name),
          avatar_url: state.avatar_url,
          quote_text: trimLocalized(state.quote_text),
          rating: Math.min(5, Math.max(1, Number(state.rating) || 5)),
          is_visible: state.is_visible,
          sort_order: Number(state.sort_order) || 0,
          ...(state.id ? {} : { created_at: now }),
        };
        if (state.id) {
          await updateDoc(doc(getDb(), "site_testimonials", id), payload);
        } else {
          await setDoc(doc(getDb(), "site_testimonials", id), payload);
        }
      }),
    onSuccess: async () => {
      toast.success("تم الحفظ");
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["site-testimonials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_testimonials", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-testimonials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onUploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة صالحة");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadSiteMedia(file, "avatars");
      setForm((prev) => (prev ? { ...prev, avatar_url: url } : prev));
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <WebsiteShell
      title="الآراء والعبارات"
      description="شهادات العملاء الظاهرة على الموقع العام"
      actions={
        enabled ? (
          <Button onClick={() => setForm(emptyForm())}>
            <Plus className="h-4 w-4" /> رأي جديد
          </Button>
        ) : undefined
      }
    >
      <DataTable
        rows={testimonials.data ?? []}
        searchPlaceholder="ابحث…"
        emptyState="لا توجد آراء بعد."
        columns={[
          {
            key: "client",
            header: "العميل",
            value: (t: SiteTestimonial) => textOf(t.client_name),
            cell: (t: SiteTestimonial) => (
              <div>
                <div className="font-medium">{textOf(t.client_name)}</div>
                <div className="text-xs text-muted-foreground">
                  {[textOf(t.client_role), textOf(t.company_name)].filter(Boolean).join(" — ")}
                </div>
              </div>
            ),
          },
          {
            key: "quote",
            header: "العبارة",
            value: (t: SiteTestimonial) => textOf(t.quote_text),
            cell: (t: SiteTestimonial) => (
              <p className="max-w-md line-clamp-2 text-sm text-muted-foreground">
                {textOf(t.quote_text)}
              </p>
            ),
          },
          {
            key: "visible",
            header: "ظاهر",
            value: (t: SiteTestimonial) => (t.is_visible ? "نعم" : "لا"),
            cell: (t: SiteTestimonial) => (t.is_visible ? "نعم" : "مخفي"),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (t: SiteTestimonial) => (
              <RowActions
                onEdit={() => setForm(toForm(t))}
                onDelete={() => setDeleteId(t.id)}
              />
            ),
          },
        ]}
      />

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل رأي" : "رأي جديد"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-3">
              <LocalizedFieldsTabs>
                {(locale) => (
                  <div className="space-y-3">
                    <LocalizedTextField
                      label="اسم العميل"
                      locale={locale}
                      value={form.client_name}
                      onChange={(client_name) => setForm({ ...form, client_name })}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LocalizedTextField
                        label="المنصب"
                        locale={locale}
                        value={form.client_role}
                        onChange={(client_role) => setForm({ ...form, client_role })}
                      />
                      <LocalizedTextField
                        label="الشركة"
                        locale={locale}
                        value={form.company_name}
                        onChange={(company_name) => setForm({ ...form, company_name })}
                      />
                    </div>
                    <LocalizedTextField
                      label="العبارة"
                      locale={locale}
                      multiline
                      rows={4}
                      value={form.quote_text}
                      onChange={(quote_text) => setForm({ ...form, quote_text })}
                    />
                  </div>
                )}
              </LocalizedFieldsTabs>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>التقييم (1–5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: Number(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>الترتيب</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) =>
                      setForm({ ...form, sort_order: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>صورة العميل</Label>
                <div className="flex items-center gap-3">
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : null}
                  <Button type="button" variant="outline" disabled={uploading} asChild>
                    <label className="cursor-pointer">
                      {uploading ? "جاري الرفع…" : "رفع صورة"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void onUploadAvatar(f);
                        }}
                      />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.is_visible}
                  onCheckedChange={(v) => setForm({ ...form, is_visible: v })}
                />
                <Label>ظاهر على الموقع</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              disabled={
                save.isPending || !textOf(form?.client_name) || !textOf(form?.quote_text)
              }
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
        title="حذف الرأي"
        description="هل أنت متأكد من حذف هذه العبارة؟"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </WebsiteShell>
  );
}
