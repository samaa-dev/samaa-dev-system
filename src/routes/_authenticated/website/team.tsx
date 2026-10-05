import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Link2, Linkedin, Upload } from "lucide-react";
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
import type {
  SiteTeamCardStyle,
  SiteTeamCtaMode,
  SiteTeamMember,
  SiteTeamPageTemplate,
  SiteTeamRoleType,
} from "@/integrations/firebase/types";
import {
  SITE_TEAM_CARD_STYLE_LABELS,
  SITE_TEAM_PAGE_TEMPLATE_LABELS,
} from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { siteTeamAdminQuery } from "@/lib/data";
import { isLikelyImageUrl, linkedInAvatarUrl } from "@/lib/linkedin-avatar";
import { SITE_TEAM_ROLE_LABELS } from "@/lib/site-defaults";
import { uploadSiteMedia } from "@/lib/site-storage";
import type { LocalizedString } from "@/lib/i18n/localized";
import { asLocalized, emptyLocalized, pick, trimLocalized } from "@/lib/i18n/localized";

export const Route = createFileRoute("/_authenticated/website/team")({
  head: () => ({
    meta: [
      { title: "الفريق — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteTeamPage,
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type FormState = {
  id?: string;
  name: string;
  slug: string;
  role_title: LocalizedString;
  role_type: SiteTeamRoleType;
  specialty: LocalizedString;
  bio: LocalizedString;
  long_bio: LocalizedString;
  highlight_quote: LocalizedString;
  avatar_url: string | null;
  cover_image_url: string | null;
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  email: string;
  website_url: string;
  whatsapp: string;
  skills: string;
  years_experience: string;
  is_visible: boolean;
  show_page: boolean;
  page_template: SiteTeamPageTemplate;
  card_style: SiteTeamCardStyle;
  page_show_skills: boolean;
  page_show_social: boolean;
  page_show_quote: boolean;
  page_show_cta: boolean;
  page_cta_mode: SiteTeamCtaMode;
  page_cta_label: LocalizedString;
  page_cta_url: string;
  sort_order: number;
};

function emptyForm(): FormState {
  return {
    name: "",
    slug: "",
    role_title: emptyLocalized(),
    role_type: "employee",
    specialty: emptyLocalized(),
    bio: emptyLocalized(),
    long_bio: emptyLocalized(),
    highlight_quote: emptyLocalized(),
    avatar_url: null,
    cover_image_url: null,
    linkedin_url: "",
    github_url: "",
    twitter_url: "",
    email: "",
    website_url: "",
    whatsapp: "",
    skills: "",
    years_experience: "",
    is_visible: true,
    show_page: true,
    page_template: "portrait",
    card_style: "photo",
    page_show_skills: true,
    page_show_social: true,
    page_show_quote: true,
    page_show_cta: true,
    page_cta_mode: "book_call",
    page_cta_label: emptyLocalized(),
    page_cta_url: "",
    sort_order: 0,
  };
}

function toForm(m: SiteTeamMember): FormState {
  return {
    id: m.id,
    name: m.name,
    slug: m.slug ?? "",
    role_title: asLocalized(m.role_title),
    role_type: m.role_type === "manager" ? "manager" : "employee",
    specialty: asLocalized(m.specialty),
    bio: asLocalized(m.bio),
    long_bio: asLocalized(m.long_bio),
    highlight_quote: asLocalized(m.highlight_quote),
    avatar_url: m.avatar_url,
    cover_image_url: m.cover_image_url ?? null,
    linkedin_url: m.linkedin_url ?? "",
    github_url: m.github_url ?? "",
    twitter_url: m.twitter_url ?? "",
    email: m.email ?? "",
    website_url: m.website_url ?? "",
    whatsapp: m.whatsapp ?? "",
    skills: (m.skills ?? []).join(", "),
    years_experience: m.years_experience ?? "",
    is_visible: m.is_visible,
    show_page: m.show_page !== false,
    page_template: m.page_template ?? "portrait",
    card_style: m.card_style ?? "photo",
    page_show_skills: m.page_show_skills !== false,
    page_show_social: m.page_show_social !== false,
    page_show_quote: m.page_show_quote !== false,
    page_show_cta: m.page_show_cta !== false,
    page_cta_mode: m.page_cta_mode ?? "book_call",
    page_cta_label: asLocalized(m.page_cta_label),
    page_cta_url: m.page_cta_url ?? "",
    sort_order: m.sort_order ?? 0,
  };
}

function WebsiteTeamPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const team = useQuery({ ...siteTeamAdminQuery(), enabled });
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"upload" | "linkedin" | "url">("upload");
  const [externalUrl, setExternalUrl] = useState("");

  const openForm = (state: FormState) => {
    setForm(state);
    setExternalUrl(state.avatar_url?.startsWith("http") ? state.avatar_url : "");
    if (state.avatar_url?.includes("unavatar.io/linkedin")) {
      setAvatarMode("linkedin");
    } else if (state.avatar_url && !state.avatar_url.includes("firebasestorage")) {
      setAvatarMode("url");
    } else {
      setAvatarMode("upload");
    }
  };

  const save = useMutation({
    mutationFn: async (state: FormState) =>
      withFirebaseError(async () => {
        const now = nowIso();
        const id = state.id ?? newId();
        const slug =
          slugify(state.slug) || slugify(state.name) || id.slice(0, 8);
        const clash = (team.data ?? []).find((m) => m.slug === slug && m.id !== state.id);
        if (clash) {
          throw new Error("الـ slug مستخدم لعضو آخر — اختر قيمة فريدة");
        }
        const skills = state.skills
          .split(/[,،]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const payload = {
          name: state.name.trim(),
          slug,
          role_title: trimLocalized(state.role_title),
          role_type: state.role_type,
          specialty: trimLocalized(state.specialty),
          bio: trimLocalized(state.bio),
          long_bio: trimLocalized(state.long_bio),
          highlight_quote: trimLocalized(state.highlight_quote),
          avatar_url: state.avatar_url,
          cover_image_url: state.cover_image_url,
          linkedin_url: state.linkedin_url.trim() || null,
          github_url: state.github_url.trim() || null,
          twitter_url: state.twitter_url.trim() || null,
          email: state.email.trim() || null,
          website_url: state.website_url.trim() || null,
          whatsapp: state.whatsapp.trim() || null,
          skills,
          years_experience: state.years_experience.trim(),
          is_visible: state.is_visible,
          show_page: state.show_page,
          page_template: state.page_template,
          card_style: state.card_style,
          page_show_skills: state.page_show_skills,
          page_show_social: state.page_show_social,
          page_show_quote: state.page_show_quote,
          page_show_cta: state.page_show_cta,
          page_cta_mode: state.page_cta_mode,
          page_cta_label: trimLocalized(state.page_cta_label),
          page_cta_url: state.page_cta_url.trim() || null,
          sort_order: Number(state.sort_order) || 0,
          ...(state.id ? {} : { created_at: now }),
        };
        if (state.id) {
          await updateDoc(doc(getDb(), "site_team", id), payload);
        } else {
          await setDoc(doc(getDb(), "site_team", id), payload);
        }
      }),
    onSuccess: async () => {
      toast.success("تم الحفظ");
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["site-team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_team", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-team"] });
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
      setAvatarMode("upload");
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const onUploadCover = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("اختر صورة صالحة");
      return;
    }
    try {
      setCoverUploading(true);
      const url = await uploadSiteMedia(file, "team-covers");
      setForm((prev) => (prev ? { ...prev, cover_image_url: url } : prev));
      toast.success("تم رفع صورة الغلاف");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setCoverUploading(false);
    }
  };

  const applyLinkedInAvatar = () => {
    if (!form?.linkedin_url.trim()) {
      toast.error("أدخل رابط ملف LinkedIn أولاً");
      return;
    }
    const url = linkedInAvatarUrl(form.linkedin_url);
    if (!url) {
      toast.error("رابط LinkedIn غير صالح — استخدم شكل: linkedin.com/in/username");
      return;
    }
    setForm({ ...form, avatar_url: url });
    setAvatarMode("linkedin");
    toast.success("تم تعيين صورة LinkedIn");
  };

  const applyExternalUrl = () => {
    if (!form) return;
    const value = externalUrl.trim();
    if (!isLikelyImageUrl(value)) {
      toast.error("أدخل رابط صورة صالح يبدأ بـ https://");
      return;
    }
    setForm({ ...form, avatar_url: value });
    setAvatarMode("url");
    toast.success("تم تعيين رابط الصورة");
  };

  return (
    <WebsiteShell
      title="الفريق"
      description="الملفات الشخصية، أسلوب البطاقة، وصفحات الأعضاء على الموقع"
      actions={
        enabled ? (
          <Button onClick={() => openForm(emptyForm())}>
            <Plus className="h-4 w-4" /> عضو جديد
          </Button>
        ) : undefined
      }
    >
      <DataTable
        rows={team.data ?? []}
        searchPlaceholder="ابحث…"
        emptyState="لا يوجد أعضاء فريق بعد."
        columns={[
          {
            key: "member",
            header: "العضو",
            value: (m: SiteTeamMember) => m.name,
            cell: (m: SiteTeamMember) => (
              <div className="flex items-center gap-3">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {m.name.slice(0, 2)}
                  </div>
                )}
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {pick(m.role_title, "ar")}
                    {m.slug ? ` · /team/${m.slug}` : ""}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            header: "النوع",
            value: (m: SiteTeamMember) => m.role_type,
            cell: (m: SiteTeamMember) => SITE_TEAM_ROLE_LABELS[m.role_type] ?? m.role_type,
          },
          {
            key: "page",
            header: "الصفحة",
            value: (m: SiteTeamMember) => (m.show_page ? "نعم" : "لا"),
            cell: (m: SiteTeamMember) =>
              m.show_page === false
                ? "مغلقة"
                : SITE_TEAM_PAGE_TEMPLATE_LABELS[m.page_template ?? "portrait"] ?? "نعم",
          },
          {
            key: "visible",
            header: "ظاهر",
            value: (m: SiteTeamMember) => (m.is_visible ? "نعم" : "لا"),
            cell: (m: SiteTeamMember) => (m.is_visible ? "نعم" : "مخفي"),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (m: SiteTeamMember) => (
              <RowActions onEdit={() => openForm(toForm(m))} onDelete={() => setDeleteId(m.id)} />
            ),
          },
        ]}
      />

      <Dialog open={Boolean(form)} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "تعديل عضو" : "عضو فريق جديد"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid gap-5">
              <section className="grid gap-3 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold">المعلومات الأساسية</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>الاسم</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Slug الصفحة</Label>
                    <Input
                      dir="ltr"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      placeholder="ahmed-ali"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      /team/{form.slug.trim() || slugify(form.name) || "…"}
                    </p>
                  </div>
                </div>
                <LocalizedFieldsTabs>
                  {(locale) => (
                    <>
                      <LocalizedTextField
                        locale={locale}
                        label="المسمى الوظيفي"
                        value={form.role_title}
                        onChange={(next) => setForm({ ...form, role_title: next })}
                      />
                      <LocalizedTextField
                        locale={locale}
                        label="تخصص / جملة قصيرة"
                        value={form.specialty}
                        onChange={(next) => setForm({ ...form, specialty: next })}
                      />
                      <LocalizedTextField
                        locale={locale}
                        label="نبذة قصيرة (البطاقة)"
                        multiline
                        rows={2}
                        value={form.bio}
                        onChange={(next) => setForm({ ...form, bio: next })}
                      />
                      <LocalizedTextField
                        locale={locale}
                        label="نبذة مطوّلة (الصفحة)"
                        multiline
                        rows={4}
                        value={form.long_bio}
                        onChange={(next) => setForm({ ...form, long_bio: next })}
                      />
                      <LocalizedTextField
                        locale={locale}
                        label="اقتباس مميز"
                        multiline
                        rows={2}
                        value={form.highlight_quote}
                        onChange={(next) => setForm({ ...form, highlight_quote: next })}
                      />
                    </>
                  )}
                </LocalizedFieldsTabs>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>النوع</Label>
                    <Select
                      value={form.role_type}
                      onValueChange={(v) =>
                        setForm({ ...form, role_type: v as SiteTeamRoleType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">مدير</SelectItem>
                        <SelectItem value="employee">موظف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>سنوات الخبرة (رقم للعرض)</Label>
                    <Input
                      dir="ltr"
                      value={form.years_experience}
                      onChange={(e) => setForm({ ...form, years_experience: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>المهارات (مفصولة بفاصلة)</Label>
                  <Input
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="Flutter, Firebase, UX"
                  />
                </div>
              </section>

              <section className="grid gap-3 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold">التواصل والروابط</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>LinkedIn</Label>
                    <Input
                      dir="ltr"
                      value={form.linkedin_url}
                      onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/…"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>GitHub</Label>
                    <Input
                      dir="ltr"
                      value={form.github_url}
                      onChange={(e) => setForm({ ...form, github_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>X / Twitter</Label>
                    <Input
                      dir="ltr"
                      value={form.twitter_url}
                      onChange={(e) => setForm({ ...form, twitter_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>الموقع</Label>
                    <Input
                      dir="ltr"
                      value={form.website_url}
                      onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد</Label>
                    <Input
                      dir="ltr"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>واتساب</Label>
                    <Input
                      dir="ltr"
                      value={form.whatsapp}
                      onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                      placeholder="+213…"
                    />
                  </div>
                </div>
              </section>

              <section className="grid gap-3 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold">الصور</h3>
                <div className="space-y-2">
                  <Label>الصورة الشخصية</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={avatarMode === "upload" ? "default" : "outline"}
                      onClick={() => setAvatarMode("upload")}
                    >
                      <Upload className="h-3.5 w-3.5" /> رفع
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={avatarMode === "linkedin" ? "default" : "outline"}
                      onClick={() => setAvatarMode("linkedin")}
                    >
                      <Linkedin className="h-3.5 w-3.5" /> من LinkedIn
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={avatarMode === "url" ? "default" : "outline"}
                      onClick={() => setAvatarMode("url")}
                    >
                      <Link2 className="h-3.5 w-3.5" /> رابط صورة
                    </Button>
                  </div>
                  {form.avatar_url ? (
                    <img
                      src={form.avatar_url}
                      alt=""
                      className="mt-2 size-16 rounded-full object-cover"
                    />
                  ) : null}
                  {avatarMode === "upload" ? (
                    <div className="flex flex-wrap items-center gap-3 pt-1">
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
                      {form.avatar_url ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setForm({ ...form, avatar_url: null })}
                        >
                          إزالة
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {avatarMode === "linkedin" ? (
                    <Button type="button" variant="outline" onClick={applyLinkedInAvatar}>
                      <Linkedin className="h-4 w-4" /> جلب صورة LinkedIn
                    </Button>
                  ) : null}
                  {avatarMode === "url" ? (
                    <div className="flex flex-wrap items-end gap-2 pt-1">
                      <div className="min-w-[14rem] flex-1 space-y-1.5">
                        <Label>رابط الصورة</Label>
                        <Input
                          dir="ltr"
                          value={externalUrl}
                          onChange={(e) => setExternalUrl(e.target.value)}
                        />
                      </div>
                      <Button type="button" variant="outline" onClick={applyExternalUrl}>
                        تطبيق
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <Label>صورة الغلاف (الصفحة / البطاقة)</Label>
                  {form.cover_image_url ? (
                    <img
                      src={form.cover_image_url}
                      alt=""
                      className="h-24 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={coverUploading} asChild>
                      <label className="cursor-pointer">
                        {coverUploading ? "جاري الرفع…" : "رفع غلاف"}
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
                    {form.cover_image_url ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setForm({ ...form, cover_image_url: null })}
                      >
                        إزالة الغلاف
                      </Button>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 rounded-xl border border-border p-3">
                <h3 className="text-sm font-semibold">العرض والصفحة</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>أسلوب البطاقة</Label>
                    <Select
                      value={form.card_style}
                      onValueChange={(v) =>
                        setForm({ ...form, card_style: v as SiteTeamCardStyle })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SITE_TEAM_CARD_STYLE_LABELS) as SiteTeamCardStyle[]).map(
                          (key) => (
                            <SelectItem key={key} value={key}>
                              {SITE_TEAM_CARD_STYLE_LABELS[key]}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>قالب الصفحة</Label>
                    <Select
                      value={form.page_template}
                      onValueChange={(v) =>
                        setForm({ ...form, page_template: v as SiteTeamPageTemplate })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(SITE_TEAM_PAGE_TEMPLATE_LABELS) as SiteTeamPageTemplate[]
                        ).map((key) => (
                          <SelectItem key={key} value={key}>
                            {SITE_TEAM_PAGE_TEMPLATE_LABELS[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ["is_visible", "ظاهر في قسم الفريق"],
                      ["show_page", "تفعيل الصفحة الخاصة + الضغط على البطاقة"],
                      ["page_show_skills", "إظهار المهارات في الصفحة"],
                      ["page_show_social", "إظهار روابط التواصل"],
                      ["page_show_quote", "إظهار الاقتباس"],
                      ["page_show_cta", "إظهار زر الدعوة"],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(form[key])}
                        onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                      />
                      <Label>{label}</Label>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>نوع زر الدعوة</Label>
                    <Select
                      value={form.page_cta_mode}
                      onValueChange={(v) =>
                        setForm({ ...form, page_cta_mode: v as SiteTeamCtaMode })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book_call">حجز مكالمة</SelectItem>
                        <SelectItem value="whatsapp">واتساب</SelectItem>
                        <SelectItem value="contact">قسم التواصل</SelectItem>
                        <SelectItem value="custom">رابط مخصص</SelectItem>
                        <SelectItem value="none">بدون</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>رابط مخصص (إن وُجد)</Label>
                    <Input
                      dir="ltr"
                      value={form.page_cta_url}
                      onChange={(e) => setForm({ ...form, page_cta_url: e.target.value })}
                      disabled={form.page_cta_mode !== "custom"}
                    />
                  </div>
                </div>
                <LocalizedFieldsTabs>
                  {(locale) => (
                    <LocalizedTextField
                      locale={locale}
                      label="نص زر الدعوة"
                      value={form.page_cta_label}
                      onChange={(next) => setForm({ ...form, page_cta_label: next })}
                    />
                  )}
                </LocalizedFieldsTabs>
                <div className="space-y-1.5">
                  <Label>ترتيب العرض</Label>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                  />
                </div>
              </section>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              إلغاء
            </Button>
            <Button
              disabled={save.isPending || !form?.name.trim()}
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
        title="حذف عضو الفريق"
        description="هل أنت متأكد من حذف هذا العضو من الموقع؟"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </WebsiteShell>
  );
}
