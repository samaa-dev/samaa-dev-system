import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DiagnosticField,
  DiagnosticFieldType,
  DiagnosticStep,
  SiteDiagnosticSettings,
} from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { diagnosticSettingsQuery, ensureSiteDefaults } from "@/lib/data";
import {
  DEFAULT_SITE_DIAGNOSTIC,
  DIAGNOSTIC_FIELD_TYPE_LABELS,
} from "@/lib/site-defaults";
import { uploadSiteMedia } from "@/lib/site-storage";

export const Route = createFileRoute("/_authenticated/website/diagnose")({
  head: () => ({
    meta: [
      { title: "صفحة التشخيص — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteDiagnosePage,
});

const FIELD_TYPES = Object.keys(DIAGNOSTIC_FIELD_TYPE_LABELS) as DiagnosticFieldType[];

function emptyField(): DiagnosticField {
  return {
    id: `field-${newId().slice(0, 8)}`,
    type: "text",
    label: "سؤال جديد",
    required: true,
    sort_order: 0,
    options: [],
  };
}

function emptyStep(order: number): DiagnosticStep {
  return {
    id: `step-${newId().slice(0, 8)}`,
    title: "خطوة جديدة",
    sort_order: order,
    is_active: true,
    fields: [emptyField()],
  };
}

function WebsiteDiagnosePage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const settingsQ = useQuery({ ...diagnosticSettingsQuery(), enabled });
  const [form, setForm] = useState<SiteDiagnosticSettings>(DEFAULT_SITE_DIAGNOSTIC);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void ensureSiteDefaults()
      .then(() => queryClient.invalidateQueries({ queryKey: ["site-settings"] }))
      .catch(() => undefined);
  }, [enabled, queryClient]);

  useEffect(() => {
    if (settingsQ.data) setForm(structuredClone(settingsQ.data));
  }, [settingsQ.data]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const payload = {
          ...form,
          funnel_version: DEFAULT_SITE_DIAGNOSTIC.funnel_version ?? 2,
          steps: form.steps.map((s, i) => ({
            ...s,
            sort_order: i,
            fields: s.fields.map((f, j) => ({ ...f, sort_order: j })),
          })),
          updated_at: nowIso(),
        };
        await setDoc(doc(getDb(), "site_settings", "diagnostic"), payload);
        return payload;
      }),
    onSuccess: async () => {
      toast.success("تم حفظ إعدادات التشخيص");
      await queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function patch<K extends keyof SiteDiagnosticSettings>(key: K, value: SiteDiagnosticSettings[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateStep(index: number, next: DiagnosticStep) {
    setForm((prev) => {
      const steps = [...prev.steps];
      steps[index] = next;
      return { ...prev, steps };
    });
  }

  function moveStep(index: number, dir: -1 | 1) {
    setForm((prev) => {
      const steps = [...prev.steps];
      const target = index + dir;
      if (target < 0 || target >= steps.length) return prev;
      const tmp = steps[index]!;
      steps[index] = steps[target]!;
      steps[target] = tmp;
      return { ...prev, steps };
    });
  }

  async function onPosterUpload(file: File | null) {
    if (!file) return;
    setUploadingPoster(true);
    try {
      const url = await uploadSiteMedia(file, "covers");
      patch("video_poster_url", url);
      toast.success("تم رفع الصورة");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setUploadingPoster(false);
    }
  }

  return (
    <WebsiteShell
      title="صفحة التشخيص"
      description="إدارة نصوص الهبوط، الفيديو، واتساب، وأسئلة القمع التشخيصي"
    >
      <div className="mb-4 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="h-4 w-4" />
          {save.isPending ? "جاري الحفظ…" : "حفظ الكل"}
        </Button>
      </div>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">محتوى Hero</h2>
        <Field label="اسم العلامة في الهيدر" value={form.brand_label} onChange={(v) => patch("brand_label", v)} />
        <Field label="شارة (Badge)" value={form.badge_text} onChange={(v) => patch("badge_text", v)} />
        <Field label="العنوان الرئيسي" value={form.headline} onChange={(v) => patch("headline", v)} multiline />
        <Field label="النص الفرعي" value={form.subheadline} onChange={(v) => patch("subheadline", v)} multiline />
        <Field label="نص زر CTA" value={form.cta_label} onChange={(v) => patch("cta_label", v)} />
        <Field label="Micro-copy تحت الزر" value={form.cta_microcopy} onChange={(v) => patch("cta_microcopy", v)} />
        <Field
          label="نص التلميح للنزول لمعرض الأعمال"
          value={form.scroll_hint}
          onChange={(v) => patch("scroll_hint", v)}
        />
      </section>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">الفيديو (VSL)</h2>
        <Field
          label="رابط الفيديو (YouTube / Vimeo / MP4)"
          value={form.video_url}
          onChange={(v) => patch("video_url", v)}
          dir="ltr"
        />
        <Field
          label="رابط صورة الغلاف"
          value={form.video_poster_url}
          onChange={(v) => patch("video_poster_url", v)}
          dir="ltr"
        />
        <div>
          <Label className="mb-2 block">رفع صورة غلاف</Label>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm hover:bg-muted">
            <Upload className="h-4 w-4" />
            {uploadingPoster ? "جاري الرفع…" : "اختر صورة"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingPoster}
              onChange={(e) => void onPosterUpload(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </section>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">قسم معرض الأعمال</h2>
        <Field label="شارة القسم" value={form.works_eyebrow} onChange={(v) => patch("works_eyebrow", v)} />
        <Field label="عنوان القسم" value={form.works_title} onChange={(v) => patch("works_title", v)} />
        <Field
          label="وصف القسم"
          value={form.works_subtitle}
          onChange={(v) => patch("works_subtitle", v)}
          multiline
        />
        <Field
          label="نص تحت زر CTA داخل المعرض"
          value={form.works_cta_microcopy}
          onChange={(v) => patch("works_cta_microcopy", v)}
        />
        <Field
          label="رسالة عند عدم وجود مشاريع"
          value={form.works_empty}
          onChange={(v) => patch("works_empty", v)}
          multiline
        />
      </section>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">قسم الإغلاق والشريط العائم</h2>
        <Field label="عنوان الإغلاق" value={form.closing_title} onChange={(v) => patch("closing_title", v)} />
        <Field
          label="وصف الإغلاق"
          value={form.closing_description}
          onChange={(v) => patch("closing_description", v)}
          multiline
        />
        <Field
          label="نص الشريط العائم (بجانب الزر)"
          value={form.float_hint}
          onChange={(v) => patch("float_hint", v)}
        />
        <Field
          label="عنوان صفحة الأسئلة (الهيدر)"
          value={form.wizard_title}
          onChange={(v) => patch("wizard_title", v)}
        />
      </section>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">إثبات اجتماعي (صفحة الهبوط)</h2>
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.proof_enabled}
              onCheckedChange={(v) => patch("proof_enabled", v)}
            />
            ظاهر
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          اختياري — إن فُعّل يظهر داخل قسم الأعمال بعد التمرير.
        </p>
        <Field
          label="النتيجة / الرقم (مثال: −42% وقت تشغيلي)"
          value={form.proof_metric}
          onChange={(v) => patch("proof_metric", v)}
        />
        <Field
          label="الاقتباس"
          value={form.proof_quote}
          onChange={(v) => patch("proof_quote", v)}
          multiline
        />
        <Field
          label="المصدر / الصفة"
          value={form.proof_author}
          onChange={(v) => patch("proof_author", v)}
        />
      </section>

      <section className="mb-8 space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">شكر واتساب</h2>
        <Field label="عنوان النجاح" value={form.thanks_title} onChange={(v) => patch("thanks_title", v)} />
        <Field
          label="وصف النجاح"
          value={form.thanks_description}
          onChange={(v) => patch("thanks_description", v)}
          multiline
        />
        <Field
          label="رقم واتساب (للتوجيه بعد الإرسال)"
          value={form.whatsapp_phone}
          onChange={(v) => patch("whatsapp_phone", v)}
          dir="ltr"
        />
        <Field
          label="قالب رسالة واتساب (يدعم {{name}} و {{company}})"
          value={form.whatsapp_message_template}
          onChange={(v) => patch("whatsapp_message_template", v)}
          multiline
        />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">خطوات القمع</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  steps: structuredClone(DEFAULT_SITE_DIAGNOSTIC.steps),
                  funnel_version: DEFAULT_SITE_DIAGNOSTIC.funnel_version ?? 2,
                }))
              }
            >
              استعادة الأسئلة الافتراضية
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  steps: [...prev.steps, emptyStep(prev.steps.length)],
                }))
              }
            >
              <Plus className="h-4 w-4" />
              إضافة خطوة
            </Button>
          </div>
        </div>

        {form.steps.map((step, si) => (
          <div key={step.id} className="rounded-lg border border-border bg-background p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Input
                className="max-w-xs font-medium"
                value={step.title}
                onChange={(e) => updateStep(si, { ...step, title: e.target.value })}
              />
              <div className="flex items-center gap-2 text-sm">
                <Switch
                  checked={step.is_active}
                  onCheckedChange={(v) => updateStep(si, { ...step, is_active: v })}
                />
                نشطة
              </div>
              <div className="ms-auto flex gap-1">
                <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(si, -1)}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => moveStep(si, 1)}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      steps: prev.steps.filter((_, i) => i !== si),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {step.fields.map((field, fi) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  onChange={(next) => {
                    const fields = [...step.fields];
                    fields[fi] = next;
                    updateStep(si, { ...step, fields });
                  }}
                  onRemove={() =>
                    updateStep(si, {
                      ...step,
                      fields: step.fields.filter((_, i) => i !== fi),
                    })
                  }
                  onMove={(dir) => {
                    const target = fi + dir;
                    if (target < 0 || target >= step.fields.length) return;
                    const fields = [...step.fields];
                    const tmp = fields[fi]!;
                    fields[fi] = fields[target]!;
                    fields[target] = tmp;
                    updateStep(si, { ...step, fields });
                  }}
                />
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  updateStep(si, {
                    ...step,
                    fields: [...step.fields, emptyField()],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                إضافة حقل
              </Button>
            </div>
          </div>
        ))}
      </section>
    </WebsiteShell>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea dir={dir} value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input dir={dir} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function FieldEditor({
  field,
  onChange,
  onRemove,
  onMove,
}: {
  field: DiagnosticField;
  onChange: (f: DiagnosticField) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div className="rounded-md border border-dashed border-border p-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[200px] flex-1"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="نص السؤال"
        />
        <Select
          value={field.type}
          onValueChange={(v) => {
            const type = v as DiagnosticFieldType;
            const next: DiagnosticField = {
              id: field.id,
              type,
              label: field.label,
              required: field.required,
              sort_order: field.sort_order,
            };
            if (field.placeholder) next.placeholder = field.placeholder;
            if (type === "single_choice" || type === "multi_choice") {
              next.options = field.options ?? [];
            }
            onChange(next);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {DIAGNOSTIC_FIELD_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs">
          <Switch
            checked={field.required}
            onCheckedChange={(v) => onChange({ ...field, required: v })}
          />
          مطلوب
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => onMove(-1)}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => onMove(1)}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      {(field.type === "text" ||
        field.type === "name" ||
        field.type === "company" ||
        field.type === "email" ||
        field.type === "phone" ||
        field.type === "url") && (
        <Input
          value={field.placeholder ?? ""}
          placeholder="نص توضيحي (placeholder)"
          onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
        />
      )}
      {(field.type === "single_choice" || field.type === "multi_choice") && (
        <div className="space-y-2">
          {(field.options ?? []).map((opt, oi) => (
            <div key={opt.id} className="flex gap-2">
              <Input
                value={opt.label}
                onChange={(e) => {
                  const options = [...(field.options ?? [])];
                  options[oi] = { ...opt, label: e.target.value };
                  onChange({ ...field, options });
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...field,
                    options: (field.options ?? []).filter((_, i) => i !== oi),
                  })
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange({
                ...field,
                options: [
                  ...(field.options ?? []),
                  { id: `opt-${newId().slice(0, 6)}`, label: "خيار جديد" },
                ],
              })
            }
          >
            <Plus className="h-4 w-4" />
            خيار
          </Button>
        </div>
      )}
    </div>
  );
}
