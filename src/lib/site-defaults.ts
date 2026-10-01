import type {
  LandingAuditSettings,
  LandingOption,
  SiteAboutSettings,
  SiteContactSettings,
  SiteHeroSettings,
  SiteServicesSettings,
  SiteSocialSettings,
} from "@/integrations/firebase/types";

export const DEFAULT_SITE_HERO: SiteHeroSettings = {
  headline: "نبني حلولاً رقمية تقود نجاحك البرمجي والتقني",
  subtitle:
    "نطوّر تطبيقات جوال بـ Flutter، ومنصات ويب وأنظمة سحابية، مع هندسة تجربة مستخدم متقدمة تُحدث فرقاً حقيقياً في أعمالك.",
  cta_label: "تواصل معنا",
  projects_count: "+50",
  satisfaction: "99%",
  experience_years: "+8",
};

export const DEFAULT_SITE_CONTACT: SiteContactSettings = {
  whatsapp: "",
  email: "hello@samaa.dev",
  phone: "",
  address: "",
};

export const DEFAULT_SITE_SOCIAL: SiteSocialSettings = {
  linkedin: "",
  github: "",
  instagram: "",
  twitter: "",
};

export const DEFAULT_SITE_ABOUT: SiteAboutSettings = {
  text: "سماء ديف وكالة حلول برمجية تبني منتجات رقمية بمعايير عالية ونتائج قابلة للقياس.",
};

export const DEFAULT_SITE_SERVICES: SiteServicesSettings = {
  items: [
    {
      title: "تطوير تطبيقات الجوال",
      subtitle: "Flutter & Dart",
      description:
        "تطبيقات أصلية الأداء لأندرويد و iOS من قاعدة كود واحدة، مع تكامل سحابي ونشر على المتاجر.",
      icon: "smartphone",
      tags: ["Flutter", "Dart", "Firebase"],
    },
    {
      title: "منصات الويب والأنظمة السحابية",
      subtitle: "Web & SaaS",
      description:
        "منصات SaaS ولوحات تحكم قابلة للتوسّع، بمعمارية آمنة وأداء عالٍ وتكاملات مع أنظمة الدفع والبيانات.",
      icon: "cloud",
      tags: ["React", "Node.js", "Cloud"],
    },
    {
      title: "هندسة تجربة المستخدم",
      subtitle: "UI/UX",
      description:
        "أنظمة تصميم متكاملة وأبحاث مستخدمين ونماذج تفاعلية تحوّل الواجهة إلى أداة نمو حقيقية.",
      icon: "wand",
      tags: ["Figma", "Design System"],
    },
  ],
};

export const DEFAULT_SITE_CATEGORIES = [
  { slug: "mobile", label: "تطبيقات جوال", sort_order: 0 },
  { slug: "web", label: "ويب وسحابية", sort_order: 1 },
  { slug: "uiux", label: "UI/UX", sort_order: 2 },
  { slug: "saas", label: "أنظمة SaaS", sort_order: 3 },
] as const;

const opt = (id: string, short: string, label: string): LandingOption => ({ id, short, label });

export const DEFAULT_LANDING_AUDIT: LandingAuditSettings = {
  welcome_title: "أهلاً بك — خلّينا نبدأ بفهم نشاطك",
  welcome_subtitle:
    "اختر نوع عملك لنرسم لك تحليلاً أدق لمواطن الهدر… مجاناً وبدون أي التزام",
  business_types: [
    opt("ecommerce", "تجارة إلكترونية", "متجر تجارة إلكترونية (E-commerce)"),
    opt("wholesale", "جملة وتوزيع", "تجارة جملة وتوزيع (Wholesale)"),
    opt("logistics", "شحن ولوجستيات", "خدمات أو شحن ولوجستيات"),
    opt("manufacturing", "ورشة / تصنيع", "ورشة أو نشاط تصنيعي"),
    opt("other", "نشاط آخر", "نشاط تجاري آخر"),
  ],
  monthly_volumes: [
    opt("lt100", "أقل من 100", "أقل من 100 طلب/معاملة"),
    opt("100-500", "100 – 500", "100 – 500 طلب"),
    opt("500-2000", "500 – 2000", "500 – 2000 طلب"),
    opt("gt2000", "أكثر من 2000", "أكثر من 2000 طلب"),
  ],
  team_sizes: [
    opt("1-3", "1 – 3", "1 – 3 موظفين"),
    opt("4-10", "4 – 10", "4 – 10 موظفين"),
    opt("11-30", "11 – 30", "11 – 30 موظفاً"),
    opt("gt30", "+30", "أكثر من 30 موظفاً"),
  ],
  challenges: [
    opt("inventory", "المخزن والجرد", "إدارة المخزن وجرد المنتجات"),
    opt("orders", "الطلبات والتوصيل", "تأكيد وتتبع الطلبات والتوصيل"),
    opt("accounting", "الحسابات والأرباح", "ضبط الحسابات والأرباح الصافية"),
    opt("data_scatter", "إكسيل وواتساب", "تشتت البيانات بين الإكسيل والواتساب"),
  ],
  volume_title: "كم طلب أو معاملة شهرياً؟",
  volume_subtitle: "تقدير تقريبي يكفي تماماً",
  team_title: "كم حجم فريقك؟",
  team_subtitle: "الموظفون المشاركون في التشغيل اليومي",
  challenges_title: "ما أكبر عائق يبطئ عملك؟",
  challenges_subtitle: "اختر واحداً أو اثنين كحد أقصى",
  contact_title: "أين نرسل خطة التحليل؟",
  contact_subtitle: "خطوة أخيرة — نكمل معك عبر واتساب",
};

export const AUDIT_STEP_LABELS: Record<number, string> = {
  1: "نوع النشاط",
  2: "حجم المعاملات",
  3: "حجم الفريق",
  4: "العوائق",
  5: "التواصل",
  6: "تم الإرسال",
};

export const SITE_LEAD_STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  in_progress: "قيد المتابعة",
  completed: "مكتمل",
};

export const SITE_AUDIT_LEAD_STATUS_LABELS: Record<string, string> = {
  in_progress: "قيد التعبئة",
  new: "جديد",
  contacted: "تم التواصل",
  qualified: "مؤهل",
  closed: "مغلق",
};

export const SITE_PROJECT_STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  published: "منشور",
};

export const SITE_TEAM_ROLE_LABELS: Record<string, string> = {
  manager: "مدير",
  employee: "موظف",
};

export {
  DEFAULT_SITE_DIAGNOSTIC,
  DIAGNOSTIC_FIELD_TYPE_LABELS,
  SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS,
  SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS,
  SITE_DIAGNOSTIC_LEAD_STATUS_LABELS,
} from "@/lib/diagnostic-defaults";
