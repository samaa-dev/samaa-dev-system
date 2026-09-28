import type {
  DiagnosticStep,
  SiteDiagnosticLeadStatus,
  SiteDiagnosticSettings,
} from "@/integrations/firebase/types";

/** كل خطوة = سؤال واحد فقط */
const DEFAULT_DIAGNOSTIC_STEPS: DiagnosticStep[] = [
  {
    id: "step-domains",
    title: "مجالات العمل",
    sort_order: 0,
    is_active: true,
    fields: [
      {
        id: "field-domains",
        type: "multi_choice",
        label: "ما مجالات عمل شركتكم؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "ops", label: "عمليات وتشغيل" },
          { id: "sales", label: "مبيعات وتسويق" },
          { id: "finance", label: "مالية ومحاسبة" },
          { id: "hr", label: "موارد بشرية" },
          { id: "support", label: "دعم عملاء" },
          { id: "logistics", label: "لوجستيات وتوصيل" },
          { id: "tech", label: "تقنية ومنتجات رقمية" },
          { id: "other", label: "أخرى" },
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
        label: "كم عدد أفراد فريقكم تقريباً؟",
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
        label: "ما هي أكثر مهمة يدوية تستنزف وقت فريقكم وتتمنون أتمتتها؟",
        placeholder: "مثال: إدخال الطلبات يدوياً من واتساب إلى Excel…",
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
          { id: "daily", label: "يومياً" },
          { id: "weekly", label: "أسبوعياً" },
          { id: "monthly", label: "شهرياً" },
        ],
      },
    ],
  },
  {
    id: "step-tools",
    title: "الأدوات الحالية",
    sort_order: 4,
    is_active: true,
    fields: [
      {
        id: "field-tools",
        type: "multi_choice",
        label: "ما الأدوات التي تعتمدون عليها حالياً؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "excel", label: "Excel / جداول" },
          { id: "whatsapp", label: "WhatsApp" },
          { id: "crm", label: "CRM" },
          { id: "erp", label: "ERP" },
          { id: "internal", label: "نظام داخلي" },
          { id: "paper", label: "ورق / يدوي بالكامل" },
          { id: "other", label: "أخرى" },
        ],
      },
    ],
  },
  {
    id: "step-timeline",
    title: "الموعد المستهدف",
    sort_order: 5,
    is_active: true,
    fields: [
      {
        id: "field-timeline",
        type: "single_choice",
        label: "متى تخططون للتنفيذ؟",
        required: true,
        sort_order: 0,
        options: [
          { id: "2m", label: "خلال شهرين" },
          { id: "3-6m", label: "3–6 أشهر" },
          { id: "explore", label: "استكشاف عام" },
        ],
      },
    ],
  },
  {
    id: "step-role",
    title: "صفة الطلب",
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
          { id: "executor", label: "منفذ" },
        ],
      },
    ],
  },
  {
    id: "step-name",
    title: "الاسم",
    sort_order: 7,
    is_active: true,
    fields: [
      {
        id: "field-name",
        type: "name",
        label: "ما اسمك؟",
        placeholder: "اسمك الكامل",
        required: true,
        sort_order: 0,
      },
    ],
  },
  {
    id: "step-company",
    title: "الشركة",
    sort_order: 8,
    is_active: true,
    fields: [
      {
        id: "field-company",
        type: "company",
        label: "ما اسم شركتك؟",
        placeholder: "اسم الشركة أو النشاط",
        required: true,
        sort_order: 0,
      },
    ],
  },
  {
    id: "step-website",
    title: "الموقع",
    sort_order: 9,
    is_active: true,
    fields: [
      {
        id: "field-website",
        type: "url",
        label: "رابط موقع الشركة (اختياري)",
        placeholder: "https://…",
        required: false,
        sort_order: 0,
      },
    ],
  },
  {
    id: "step-phone",
    title: "واتساب",
    sort_order: 10,
    is_active: true,
    fields: [
      {
        id: "field-phone",
        type: "phone",
        label: "ما رقم واتسابك؟",
        placeholder: "05xxxxxxxx",
        required: true,
        sort_order: 0,
      },
    ],
  },
  {
    id: "step-email",
    title: "البريد",
    sort_order: 11,
    is_active: true,
    fields: [
      {
        id: "field-email",
        type: "email",
        label: "ما بريدك الإلكتروني؟",
        placeholder: "you@company.com",
        required: true,
        sort_order: 0,
      },
    ],
  },
];

export const DEFAULT_SITE_DIAGNOSTIC: SiteDiagnosticSettings = {
  badge_text: "⚡ تشخيص تقني وتشغيلي مخصص لشركتك",
  headline: "أين يضيع وقت فريقك؟",
  subheadline: "تشخيص مجاني لفرص الأتمتة — تقرير مخصص خلال يومي عمل",
  cta_label: "ابدأ التشخيص المجاني",
  cta_microcopy: "دقيقتان فقط • بدون أي التزام",
  video_url: "",
  video_poster_url: "",
  proof_enabled: false,
  proof_metric: "",
  proof_quote: "",
  proof_author: "",
  thanks_title: "تم استلام طلب التشخيص بنجاح",
  thanks_description:
    "فريق Samaa Dev سيراجع إجاباتك ويُعدّ تقريراً مخصصاً. يمكنك الإسراع بالتواصل عبر واتساب الآن.",
  whatsapp_phone: "",
  whatsapp_message_template:
    "مرحباً Samaa Dev، أتممتُ تشخيص الشركة.\nالاسم: {{name}}\nالشركة: {{company}}\nأرغب بمتابعة التقرير التشخيصي.",
  steps: DEFAULT_DIAGNOSTIC_STEPS,
};

export const SITE_DIAGNOSTIC_LEAD_STATUS_LABELS: Record<SiteDiagnosticLeadStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهّل",
  closed: "مغلق",
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
