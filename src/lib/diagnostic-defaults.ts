import type {
  DiagnosticStep,
  SiteDiagnosticLeadStatus,
  SiteDiagnosticSettings,
} from "@/integrations/firebase/types";

export const STATUS_FIELD_ID = "field-status";
export const STATUS_EXISTING_ID = "existing";
export const STATUS_IDEA_ID = "idea";

/** كل خطوة = سؤال واحد، ما عدا خطوة التواصل المجمّعة */
const DEFAULT_DIAGNOSTIC_STEPS: DiagnosticStep[] = [
  {
    id: "step-status",
    title: "بداية التشخيص",
    sort_order: 0,
    is_active: true,
    fields: [
      {
        id: STATUS_FIELD_ID,
        type: "single_choice",
        label: "هل لديك شركة أو مشروع قائم حاليًا؟",
        required: true,
        sort_order: 0,
        options: [
          { id: STATUS_EXISTING_ID, label: "نعم، شركة قائمة" },
          { id: STATUS_IDEA_ID, label: "لا، ما زالت فكرة" },
        ],
      },
    ],
  },
  {
    id: "step-team-size",
    title: "حجم الفريق",
    sort_order: 1,
    is_active: true,
    fields: [
      {
        id: "field-team-size",
        type: "single_choice",
        label: "كم عدد أفراد فريقكم؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "1-10", label: "1–10" },
          { id: "11-50", label: "11–50" },
          { id: "51-200", label: "51–200" },
          { id: "200+", label: "+200" },
        ],
      },
    ],
  },
  {
    id: "step-manual-task",
    title: "المهمة المستنزِفة",
    sort_order: 2,
    is_active: true,
    fields: [
      {
        id: "field-manual-task",
        type: "text",
        label: "ما أكثر مهمة تستهلك وقت فريقكم وتتمنون أتمتتها؟",
        placeholder: "مثال: إدخال الطلبات يدويًا من واتساب إلى Excel.",
        required: true,
        sort_order: 0,
      },
    ],
  },
  {
    id: "step-frequency",
    title: "معدل التكرار",
    sort_order: 3,
    is_active: true,
    fields: [
      {
        id: "field-frequency",
        type: "single_choice",
        label: "كم مرة تتكرر هذه المهمة؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "several-daily", label: "عدة مرات يوميًا" },
          { id: "daily", label: "يوميًا" },
          { id: "weekly", label: "أسبوعيًا" },
          { id: "monthly", label: "شهريًا" },
        ],
      },
    ],
  },
  {
    id: "step-method",
    title: "طريقة التنفيذ",
    sort_order: 4,
    is_active: true,
    fields: [
      {
        id: "field-method",
        type: "single_choice",
        label: "كيف تنفذون هذه المهمة حاليًا؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "excel", label: "Excel / جداول" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "system", label: "نظام أو برنامج" },
          { id: "paper", label: "ورق / يدوي" },
          { id: "other", label: "أخرى" },
        ],
      },
    ],
  },
  {
    id: "step-timeline",
    title: "موعد التنفيذ",
    sort_order: 5,
    is_active: true,
    fields: [
      {
        id: "field-timeline",
        type: "single_choice",
        label: "متى تفكرون في تنفيذ الحل؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "1-2m", label: "خلال 1–2 شهر" },
          { id: "3-6m", label: "خلال 3–6 أشهر" },
          { id: "explore", label: "مجرد استكشاف حاليًا" },
        ],
      },
    ],
  },
  {
    id: "step-role",
    title: "صفتك",
    sort_order: 6,
    is_active: true,
    fields: [
      {
        id: "field-role",
        type: "single_choice",
        label: "ما صفتك في الشركة؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "decision", label: "صاحب القرار" },
          { id: "manager", label: "مدير" },
          { id: "executor", label: "موظف / منفذ" },
        ],
      },
    ],
  },
  {
    id: "step-contact",
    title: "بيانات التواصل",
    sort_order: 7,
    is_active: true,
    fields: [
      {
        id: "field-name",
        type: "name",
        label: "الاسم",
        placeholder: "اسمك الكامل",
        required: true,
        sort_order: 0,
      },
      {
        id: "field-company",
        type: "company",
        label: "اسم الشركة",
        placeholder: "اسم الشركة أو النشاط",
        required: true,
        sort_order: 1,
      },
      {
        id: "field-phone",
        type: "phone",
        label: "رقم واتساب",
        placeholder: "05xxxxxxxx",
        required: true,
        sort_order: 2,
      },
    ],
  },
];

export const DEFAULT_SITE_DIAGNOSTIC: SiteDiagnosticSettings = {
  badge_text: "⚡ تشخيص تقني وتشغيلي مخصص لشركتك",
  brand_label: "Samaa Dev",
  headline: "أين يضيع وقت فريقك؟",
  subheadline: "تشخيص مجاني لفرص الأتمتة — تقرير مخصص خلال يومي عمل",
  cta_label: "ابدأ التشخيص المجاني",
  cta_microcopy: "دقيقتان فقط • بدون أي التزام",
  video_url: "",
  video_poster_url: "",
  scroll_hint: "للإطلاع على معرض الأعمال انزل للأسفل",
  works_eyebrow: "معرض الأعمال",
  works_title: "أعمال حقيقية… ونتائج ملموسة",
  works_subtitle:
    "أنظمة وأتمتة بنيناها لشركات تشبه تحدياتك — اطّلع ثم ابدأ تشخيص شركتك مجاناً.",
  works_cta_microcopy: "ابدأ الآن — نفس التشخيص المجاني خلال دقيقتين",
  works_empty: "سيظهر هنا معرض الأعمال بعد نشر المشاريع من لوحة التحكم.",
  closing_title: "جاهز تعرف أين يضيع وقت فريقك؟",
  closing_description: "أجب عن أسئلة قصيرة واحصل على تقرير تشخيصي مخصص خلال يومي عمل.",
  float_hint: "تشخيص مجاني لشركتك",
  wizard_title: "تشخيص Samaa Dev",
  proof_enabled: false,
  proof_metric: "",
  proof_quote: "",
  proof_author: "",
  thanks_title: "شكراً لك — استلمنا إجاباتك",
  thanks_description:
    "سنراجع ما شاركته معنا ونتواصل معك قريباً. نقدّر ثقتك بـ Samaa Dev، ويسعدنا أن نكون جزءاً من رحلتك.",
  whatsapp_phone: "",
  whatsapp_message_template:
    "مرحباً Samaa Dev، أتممتُ تشخيص الشركة.\nالاسم: {{name}}\nالشركة: {{company}}\nأرحّب بمتابعتكم.",
  funnel_version: 5,
  steps: DEFAULT_DIAGNOSTIC_STEPS,
};

export const SITE_DIAGNOSTIC_LEAD_STATUS_LABELS: Record<SiteDiagnosticLeadStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهّل",
  closed: "مغلق",
};

export const SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS: Record<"diagnose" | "idea_consult", string> = {
  diagnose: "تشخيص شركات",
  idea_consult: "استشارة فكرة",
};

export const SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS: Record<
  "in_progress" | "completed" | "left_to_idea",
  string
> = {
  in_progress: "لم يُكمل",
  completed: "مكتمل",
  left_to_idea: "انتقل لمسار الفكرة",
};

export const DIAGNOSTIC_FIELD_TYPE_LABELS: Record<string, string> = {
  single_choice: "اختيار واحد",
  multi_choice: "اختيار متعدد",
  text: "نص حر",
  name: "الاسم",
  company: "اسم الشركة",
  email: "بريد إلكتروني",
  phone: "هاتف / واتساب",
  url: "رابط موقع",
};
