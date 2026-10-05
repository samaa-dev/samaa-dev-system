import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { ExternalLink, Film, ImageIcon, Save, Trash2, Upload } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteVslSettings } from "@/integrations/firebase/types";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { vslSettingsQuery } from "@/lib/data";
import { DEFAULT_SITE_VSL } from "@/lib/site-defaults";
import { uploadSiteMedia } from "@/lib/site-storage";

export const Route = createFileRoute("/_authenticated/landing/vsl")({
  head: () => ({
    meta: [
      { title: "صفحة الإعلان (VSL) — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingVslPage,
});

const MAX_VIDEO_MB = 300;

/** YouTube / Vimeo link → embeddable player URL (null for direct video files). */
function embedUrl(url: string): string | null {
  const yt = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/,
  );
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&modestbranding=1`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const wistia = url.match(/wistia\.(?:com|net)\/(?:medias|embed\/iframe|embed\/medias)\/([a-z0-9]{10})/i);
  if (wistia) return `https://fast.wistia.net/embed/iframe/${wistia[1]}?playerColor=7b3aec`;
  return null;
}

/** Like embedUrl, but also resolves Wistia share links (…wistia.com/s/xxxx) through Wistia oEmbed. */
function useEmbedUrl(url: string): string | null {
  const direct = embedUrl(url);
  const isShare = !direct && /\.wistia\.com\/s\/[a-z0-9]+/i.test(url);
  const [resolved, setResolved] = useState<string | null>(null);
  useEffect(() => {
    setResolved(null);
    if (!isShare) return;
    let alive = true;
    fetch(`https://fast.wistia.com/oembed?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((d: { html?: string }) => {
        const m = String(d?.html ?? "").match(/embed\/iframe\/([a-z0-9]{10})/i);
        if (alive && m) setResolved(`https://fast.wistia.net/embed/iframe/${m[1]}?playerColor=7b3aec`);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [url, isShare]);
  return direct ?? resolved;
}

function LandingVslPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const settingsQ = useQuery({ ...vslSettingsQuery(), enabled });
  const [form, setForm] = useState<SiteVslSettings>(DEFAULT_SITE_VSL);
  const [videoPct, setVideoPct] = useState<number | null>(null);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const previewEmbed = useEmbedUrl(form.video_url);

  useEffect(() => {
    if (settingsQ.data) setForm(structuredClone(settingsQ.data));
  }, [settingsQ.data]);

  function patch<K extends keyof SiteVslSettings>(key: K, value: SiteVslSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const save = useMutation({
    mutationFn: async (next: SiteVslSettings) =>
      withFirebaseError(async () => {
        const payload = {
          ...next,
          whatsapp_phone: next.whatsapp_phone.replace(/[^\d]/g, ""),
          meta_pixel_id: next.meta_pixel_id.trim(),
          updated_at: nowIso(),
        };
        await setDoc(doc(getDb(), "site_settings", "vsl_landing"), payload);
        return payload;
      }),
    onSuccess: async () => {
      toast.success("تم حفظ محتوى صفحة الهبوط");
      await queryClient.invalidateQueries({ queryKey: ["site-settings", "vsl_landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onVideoUpload(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("الملف ليس فيديو");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`حجم الفيديو أكبر من ${MAX_VIDEO_MB}MB`);
      return;
    }
    setVideoPct(0);
    try {
      const url = await uploadSiteMedia(file, "videos", setVideoPct);
      const next = { ...form, video_url: url };
      setForm(next);
      save.mutate(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل رفع الفيديو");
    } finally {
      setVideoPct(null);
    }
  }

  async function onPosterUpload(file: File | null) {
    if (!file) return;
    setUploadingPoster(true);
    try {
      const url = await uploadSiteMedia(file, "covers");
      patch("video_poster_url", url);
      toast.success("تم رفع صورة الغلاف — لا تنسَ الحفظ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploadingPoster(false);
    }
  }

  const uploadingVideo = videoPct !== null;

  return (
    <LandingShell
      title="محتوى صفحة الهبوط"
      description="الفيديو، العناوين، واتساب و Meta Pixel — ما يظهر على landing.html"
      actions={
        <Button onClick={() => save.mutate(form)} disabled={save.isPending || uploadingVideo}>
          <Save className="h-4 w-4" />
          {save.isPending ? "جاري الحفظ…" : "حفظ"}
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">فيديو VSL</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              فيديو أفقي 16:9 (مثلاً 1920×1080). ارفعه مباشرة (MP4 حتى {MAX_VIDEO_MB}MB) أو الصق رابط
              YouTube / Vimeo. يُحفظ تلقائياً بعد انتهاء الرفع، ويظهر في الصفحة فوراً.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 aria-disabled:opacity-60">
                <Upload className="h-4 w-4" />
                {uploadingVideo ? `جاري الرفع… ${videoPct}%` : "رفع فيديو جديد"}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  disabled={uploadingVideo}
                  onChange={(e) => {
                    void onVideoUpload(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.video_url ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => patch("video_url", "")}
                  disabled={uploadingVideo}
                >
                  <Trash2 className="h-4 w-4" />
                  إزالة الفيديو
                </Button>
              ) : null}
            </div>
            {uploadingVideo ? <Progress value={videoPct ?? 0} /> : null}

            <Field
              label="رابط الفيديو (Wistia أو YouTube أو Vimeo أو ملف MP4)"
              value={form.video_url}
              onChange={(v) => patch("video_url", v)}
              dir="ltr"
              hint="اتركه فارغاً لاستخدام الفيديو الافتراضي المرفوع مع الموقع."
            />

            <div className="space-y-2">
              <Label>صورة الغلاف (اختياري)</Label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
                  <ImageIcon className="h-4 w-4" />
                  {uploadingPoster ? "جاري الرفع…" : "اختر صورة"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingPoster}
                    onChange={(e) => void onPosterUpload(e.target.files?.[0] ?? null)}
                  />
                </label>
                {form.video_poster_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => patch("video_poster_url", "")}
                  >
                    إزالة
                  </Button>
                ) : null}
              </div>
              <Input
                dir="ltr"
                value={form.video_poster_url}
                onChange={(e) => patch("video_poster_url", e.target.value)}
                placeholder="https://…"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">نصوص أعلى الصفحة</h2>
            <p className="text-sm text-muted-foreground">
              اترك أي حقل فارغاً للإبقاء على النص المكتوب في تصميم الصفحة.
            </p>
            <Field label="الشارة فوق العنوان" value={form.badge_text} onChange={(v) => patch("badge_text", v)} />
            <Field
              label="العنوان الرئيسي"
              value={form.headline}
              onChange={(v) => patch("headline", v)}
              multiline
              hint="ضع الجزء الذي تريد تلوينه بين نجمتين، مثال: من فوضى الطلبات إلى *400 طلب في ساعة واحدة.*"
            />
            <Field
              label="النص الفرعي"
              value={form.subheadline}
              onChange={(v) => patch("subheadline", v)}
              multiline
            />
            <Field label="نص زر الحجز" value={form.cta_label} onChange={(v) => patch("cta_label", v)} />
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">التواصل والتتبع</h2>
            <Field
              label="رقم واتساب (بالصيغة الدولية)"
              value={form.whatsapp_phone}
              onChange={(v) => patch("whatsapp_phone", v)}
              dir="ltr"
              hint="مثال: 213555123456 — يُستخدم في زر واتساب العائم وبعد إرسال الحجز."
            />
            <Field
              label="رسالة واتساب الافتراضية"
              value={form.whatsapp_greeting}
              onChange={(v) => patch("whatsapp_greeting", v)}
              multiline
            />
            <Field
              label="Meta Pixel ID"
              value={form.meta_pixel_id}
              onChange={(v) => patch("meta_pixel_id", v)}
              dir="ltr"
              hint="يتتبع: مشاهدة الفيديو، نسب المشاهدة، النقر على الأزرار، وإرسال الحجز (Lead)."
            />
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">قسم الأعمال السابقة</h2>
            <p className="text-sm text-muted-foreground">
              الأعمال تُسحب تلقائياً من{" "}
              <Link to="/website/projects" className="text-primary underline-offset-4 hover:underline">
                مشاريع المعرض
              </Link>{" "}
              (المنشورة فقط، المميزة أولاً ثم حسب الترتيب).
            </p>
            <div className="max-w-[200px] space-y-1.5">
              <Label>عدد الأعمال المعروضة</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={form.works_limit}
                onChange={(e) => patch("works_limit", Number(e.target.value) || 1)}
              />
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold">معاينة الفيديو</h3>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {previewEmbed ? (
                <iframe
                  key={form.video_url}
                  src={previewEmbed}
                  title="معاينة الفيديو"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : form.video_url ? (
                <video
                  key={form.video_url}
                  src={form.video_url}
                  poster={form.video_poster_url || undefined}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-6 text-center text-xs text-white/70">
                  يُستخدم الفيديو الافتراضي المرفوع مع الموقع
                </div>
              )}
            </div>
            {settingsQ.data?.updated_at ? (
              <p className="text-xs text-muted-foreground">
                آخر حفظ: {new Date(settingsQ.data.updated_at).toLocaleString("ar-DZ")}
              </p>
            ) : null}
            <Button asChild variant="outline" className="w-full">
              <Link to="/website/diagnose-leads">
                <ExternalLink className="h-4 w-4" />
                طلبات الحجز
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </LandingShell>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  dir,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea dir={dir} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
