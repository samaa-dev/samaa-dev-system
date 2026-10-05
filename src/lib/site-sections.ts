/** Shared website page-section model (system + free custom blocks). */

import {
  asLocalized,
  localized,
  pick,
  type LocalizedString,
} from "@/lib/i18n/localized";

export type SiteSystemKey =
  | "hero"
  | "services"
  | "case_studies"
  | "team"
  | "testimonials"
  | "contact";

export type SiteCustomTemplate =
  | "split_media"
  | "feature_cards"
  | "stats_band"
  | "cta_banner"
  | "process_steps"
  | "faq"
  | "quote"
  | "type_canvas"
  | "offset_story"
  | "word_ladder"
  | "editorial"
  | "quote_mosaic"
  | "overlay_caption";

export type SiteSectionVariant = "light" | "muted" | "navy" | "brand";

export type SiteSectionItem = {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  icon?: string;
  value?: string;
  image_url?: string | null;
};

export type SitePageSection = {
  id: string;
  kind: "system" | "custom";
  system_key?: SiteSystemKey;
  template: SiteCustomTemplate | "system";
  visible: boolean;
  sort_order: number;
  show_in_nav: boolean;
  nav_label: LocalizedString;
  eyebrow: LocalizedString;
  title: LocalizedString;
  subtitle: LocalizedString;
  body: LocalizedString;
  image_url: string | null;
  cta_label: LocalizedString;
  cta_href: string;
  variant: SiteSectionVariant;
  items: SiteSectionItem[];
};

export type SiteLayoutSettings = {
  sections: SitePageSection[];
};

export const SITE_SYSTEM_KEYS: SiteSystemKey[] = [
  "hero",
  "services",
  "case_studies",
  "team",
  "testimonials",
  "contact",
];

export const SITE_SYSTEM_LABELS: Record<SiteSystemKey, string> = {
  hero: "شاشة الاستقبال",
  services: "الخدمات",
  case_studies: "معرض الأعمال",
  team: "الفريق",
  testimonials: "آراء العملاء",
  contact: "التواصل",
};

export const SITE_SYSTEM_ANCHORS: Record<SiteSystemKey, string> = {
  hero: "home",
  services: "services",
  case_studies: "case-studies",
  team: "team",
  testimonials: "testimonials",
  contact: "contact",
};

export const SITE_CUSTOM_TEMPLATE_LABELS: Record<SiteCustomTemplate, string> = {
  split_media: "نص وصورة",
  feature_cards: "بطاقات مميزات",
  stats_band: "أرقام وإحصائيات",
  cta_banner: "شريط دعوة",
  process_steps: "خطوات العملية",
  faq: "أسئلة شائعة",
  quote: "اقتباس مميز",
  type_canvas: "لوحة عنوان عملاقة",
  offset_story: "نص متأرجح",
  word_ladder: "سلم كلمات",
  editorial: "عمود تحريري",
  quote_mosaic: "فسيفساء نصوص",
  overlay_caption: "تعليق فوق صورة",
};

export const SITE_CUSTOM_TEMPLATE_HINTS: Record<SiteCustomTemplate, string> = {
  split_media: "نص بجانب صورة بعرض ثابت",
  feature_cards: "بطاقات مميزات بأيقونات",
  stats_band: "صف أرقام كبيرة",
  cta_banner: "دعوة واضحة للفعل",
  process_steps: "مراحل مرقّمة",
  faq: "أسئلة قابلة للفتح",
  quote: "اقتباس مركزي بارز",
  type_canvas: "عنوان يملأ الشاشة مع تعليق صغير في الزاوية",
  offset_story: "عنوان ضخم في طرف ونص في الطرف المقابل",
  word_ladder: "كلمات بأحجام تصاعدية — إبداع في الطباعة",
  editorial: "أسلوب مجلة: حرف عملاق وعمود نص ضيق",
  quote_mosaic: "شذرات نصية متناثرة بمواقع وأحجام مختلفة",
  overlay_caption: "صورة كاملة مع نصوص في زوايا إبداعية",
};

export const SITE_VARIANT_LABELS: Record<SiteSectionVariant, string> = {
  light: "فاتح",
  muted: "هادئ",
  navy: "داكن",
  brand: "هوية العلامة",
};

const SYSTEM_DEFAULTS: Record<
  SiteSystemKey,
  Pick<SitePageSection, "nav_label" | "eyebrow" | "title" | "subtitle" | "show_in_nav">
> = {
  hero: {
    nav_label: localized("الرئيسية", "Home", "Accueil"),
    eyebrow: localized(""),
    title: localized(""),
    subtitle: localized(""),
    show_in_nav: true,
  },
  services: {
    nav_label: localized("خدماتنا", "Services", "Services"),
    eyebrow: localized("خدماتنا", "Services", "Services"),
    title: localized(
      "نغطي دورة حياة المنتج الرقمي بالكامل",
      "We cover the full digital product lifecycle",
      "Nous couvrons tout le cycle de vie du produit digital",
    ),
    subtitle: localized(
      "من الفكرة والتحليل، إلى التصميم والتطوير والإطلاق والتحسين المستمر.",
      "From idea and analysis to design, build, launch and continuous improvement.",
      "De l’idée à l’amélioration continue : conception, développement et lancement.",
    ),
    show_in_nav: true,
  },
  case_studies: {
    nav_label: localized("معرض الأعمال", "Portfolio", "Portfolio"),
    eyebrow: localized("معرض الأعمال", "Portfolio", "Portfolio"),
    title: localized(
      "نتائج حقيقية لشركاء الأعمال",
      "Real results for business partners",
      "Des résultats concrets pour nos partenaires",
    ),
    subtitle: localized(
      "قصص مشاريع نقيسها بالأثر على النمو والكفاءة وتجربة المستخدم.",
      "Project stories measured by growth, efficiency and user experience.",
      "Des projets mesurés par la croissance, l’efficacité et l’expérience.",
    ),
    show_in_nav: true,
  },
  team: {
    nav_label: localized("الفريق", "Team", "Équipe"),
    eyebrow: localized("فريقنا", "Our team", "Notre équipe"),
    title: localized(
      "العقول التي تبني منتجك",
      "The minds building your product",
      "Les talents qui construisent votre produit",
    ),
    subtitle: localized(
      "مدراء ومهندسون ومصممون يعملون معاً لتحويل فكرتك إلى منتج قابل للقياس.",
      "Managers, engineers and designers turning ideas into measurable products.",
      "Managers, ingénieurs et designers au service d’un produit mesurable.",
    ),
    show_in_nav: true,
  },
  testimonials: {
    nav_label: localized("آراء العملاء", "Testimonials", "Témoignages"),
    eyebrow: localized("آراء العملاء", "Testimonials", "Témoignages"),
    title: localized(
      "كلمات من شركاء النجاح",
      "Words from success partners",
      "Paroles de partenaires",
    ),
    subtitle: localized(
      "شهادات موثّقة من عملاء بنينا معهم منتجات حقيقية.",
      "Verified quotes from clients we shipped real products with.",
      "Des avis vérifiés de clients avec qui nous avons livré.",
    ),
    show_in_nav: true,
  },
  contact: {
    nav_label: localized("تواصل معنا", "Contact", "Contact"),
    eyebrow: localized("تواصل معنا", "Contact", "Contact"),
    title: localized(
      "لنحوّل فكرتك إلى منتج",
      "Let’s turn your idea into a product",
      "Transformons votre idée en produit",
    ),
    subtitle: localized(
      "أخبرنا عن مشروعك وسنعود إليك بخطة واضحة وخطوات عملية.",
      "Tell us about your project and we’ll reply with a clear plan.",
      "Parlez-nous de votre projet — nous reviendrons avec un plan clair.",
    ),
    show_in_nav: true,
  },
};

function blankBase(partial?: Partial<SitePageSection>): Omit<SitePageSection, "kind" | "template"> {
  const base: Omit<SitePageSection, "kind" | "template" | "system_key"> & {
    system_key?: SiteSystemKey;
  } = {
    id: partial?.id ?? `sec_${Math.random().toString(36).slice(2, 10)}`,
    visible: partial?.visible ?? true,
    sort_order: partial?.sort_order ?? 0,
    show_in_nav: partial?.show_in_nav ?? true,
    nav_label: partial?.nav_label ?? localized(""),
    eyebrow: partial?.eyebrow ?? localized(""),
    title: partial?.title ?? localized(""),
    subtitle: partial?.subtitle ?? localized(""),
    body: partial?.body ?? localized(""),
    image_url: partial?.image_url ?? null,
    cta_label: partial?.cta_label ?? localized(""),
    cta_href: partial?.cta_href ?? "/contact",
    variant: partial?.variant ?? "light",
    items: partial?.items ?? [],
  };
  if (partial?.system_key) base.system_key = partial.system_key;
  return base;
}

export function createSystemSection(
  key: SiteSystemKey,
  overrides?: Partial<SitePageSection>,
): SitePageSection {
  const d = SYSTEM_DEFAULTS[key];
  return {
    ...blankBase({
      id: overrides?.id ?? `sys_${key}`,
      ...d,
      ...overrides,
    }),
    kind: "system",
    system_key: key,
    template: "system",
  };
}

function item(
  titleAr: string,
  descriptionAr: string,
  extra?: Partial<SiteSectionItem> & { titleEn?: string; titleFr?: string; descEn?: string; descFr?: string },
): SiteSectionItem {
  const { titleEn, titleFr, descEn, descFr, ...rest } = extra ?? {};
  return {
    id: `it_${Math.random().toString(36).slice(2, 8)}`,
    title: localized(titleAr, titleEn, titleFr),
    description: localized(descriptionAr, descEn, descFr),
    ...rest,
  };
}

export function createCustomSection(
  template: SiteCustomTemplate,
  overrides?: Partial<SitePageSection>,
): SitePageSection {
  const starters: Record<
    SiteCustomTemplate,
    Pick<
      SitePageSection,
      | "nav_label"
      | "eyebrow"
      | "title"
      | "subtitle"
      | "body"
      | "cta_label"
      | "cta_href"
      | "variant"
      | "items"
      | "show_in_nav"
    >
  > = {
    split_media: {
      nav_label: localized("قصتنا", "Our story", "Notre histoire"),
      eyebrow: localized("من نحن", "About", "À propos"),
      title: localized("نبني بثقة ونقيس بالأثر", "We build with confidence and measure impact", "Nous construisons avec impact"),
      subtitle: localized(
        "فريق يجمع خبرات المنتج والهندسة والتصميم.",
        "A team combining product, engineering and design.",
        "Une équipe produit, ingénierie et design.",
      ),
      body: localized(""),
      cta_label: localized("تواصل معنا", "Contact us", "Nous contacter"),
      cta_href: "/contact",
      variant: "light",
      show_in_nav: true,
      items: [],
    },
    feature_cards: {
      nav_label: localized("المميزات", "Features", "Fonctionnalités"),
      eyebrow: localized("لماذا نحن", "Why us", "Pourquoi nous"),
      title: localized("قيمة واضحة في كل مرحلة", "Clear value at every stage", "De la valeur à chaque étape"),
      subtitle: localized("", " ", " "),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "muted",
      show_in_nav: true,
      items: [
        item("جودة هندسية", "معايير كود ومراجعة مستمرة.", {
          titleEn: "Engineering quality",
          titleFr: "Qualité d’ingénierie",
          descEn: "Code standards and continuous review.",
          descFr: "Standards de code et revue continue.",
          icon: "sparkles",
        }),
        item("تصميم منتج", "واجهات تخدم أهداف العمل.", {
          titleEn: "Product design",
          titleFr: "Design produit",
          descEn: "Interfaces that serve business goals.",
          descFr: "Des interfaces au service du business.",
          icon: "wand",
        }),
        item("إطلاق سريع", "خطط مرحلية ونتائج مبكرة.", {
          titleEn: "Fast launch",
          titleFr: "Lancement rapide",
          descEn: "Phased plans with early outcomes.",
          descFr: "Plans par phases et résultats rapides.",
          icon: "rocket",
        }),
      ],
    },
    stats_band: {
      nav_label: localized(""),
      eyebrow: localized("أرقام", "Numbers", "Chiffres"),
      title: localized("أثر نقيسه معاً", "Impact we measure together", "Un impact que nous mesurons"),
      subtitle: localized(""),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "navy",
      show_in_nav: false,
      items: [
        item("مشاريع", "", { value: "+50", titleEn: "Projects", titleFr: "Projets" }),
        item("رضا", "", { value: "99%", titleEn: "Satisfaction", titleFr: "Satisfaction" }),
        item("سنوات", "", { value: "+8", titleEn: "Years", titleFr: "Années" }),
        item("أسواق", "", { value: "12+", titleEn: "Markets", titleFr: "Marchés" }),
      ],
    },
    cta_banner: {
      nav_label: localized(""),
      eyebrow: localized("ابدأ الآن", "Start now", "Commencer"),
      title: localized("جاهزون لبناء منتجك القادم", "Ready to build your next product", "Prêts pour votre prochain produit"),
      subtitle: localized("دعنا نحدد النطاق والأولويات في مكالمة قصيرة.", "Let’s scope priorities in a short call.", "Définissons le périmètre en un court appel."),
      body: localized(""),
      cta_label: localized("احجز استشارة", "Book a consult", "Réserver un appel"),
      cta_href: "#book-call",
      variant: "brand",
      show_in_nav: false,
      items: [],
    },
    process_steps: {
      nav_label: localized("كيف نعمل", "How we work", "Notre méthode"),
      eyebrow: localized("العملية", "Process", "Processus"),
      title: localized("مسار واضح من الفكرة للإطلاق", "A clear path from idea to launch", "Un chemin clair de l’idée au lancement"),
      subtitle: localized(""),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "light",
      show_in_nav: true,
      items: [
        item("اكتشاف", "فهم الأهداف والمستخدمين.", {
          titleEn: "Discover",
          titleFr: "Découverte",
          descEn: "Understand goals and users.",
          descFr: "Comprendre objectifs et utilisateurs.",
          icon: "search",
        }),
        item("تصميم", "نماذج وتجارب قابلة للاختبار.", {
          titleEn: "Design",
          titleFr: "Design",
          descEn: "Testable prototypes and flows.",
          descFr: "Prototypes et parcours testables.",
          icon: "wand",
        }),
        item("بناء", "تطوير متكرر بجودة عالية.", {
          titleEn: "Build",
          titleFr: "Construction",
          descEn: "Iterative high-quality development.",
          descFr: "Développement itératif de qualité.",
          icon: "rocket",
        }),
        item("إطلاق", "نشر وقياس وتحسين.", {
          titleEn: "Launch",
          titleFr: "Lancement",
          descEn: "Ship, measure and improve.",
          descFr: "Livrer, mesurer et améliorer.",
          icon: "sparkles",
        }),
      ],
    },
    faq: {
      nav_label: localized("الأسئلة", "FAQ", "FAQ"),
      eyebrow: localized("أسئلة شائعة", "FAQ", "FAQ"),
      title: localized("إجابات سريعة", "Quick answers", "Réponses rapides"),
      subtitle: localized(""),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "muted",
      show_in_nav: true,
      items: [
        item("كم تستغرق المشاريع؟", "حسب النطاق — عادة من أسابيع إلى بضعة أشهر بخطط مرحلية.", {
          titleEn: "How long do projects take?",
          titleFr: "Combien de temps durent les projets ?",
          descEn: "Depends on scope — usually weeks to a few months in phases.",
          descFr: "Selon le périmètre — souvent de quelques semaines à quelques mois.",
        }),
        item("هل تعملون عن بُعد؟", "نعم، بآليات تواصل واضحة وتقارير تقدم منتظمة.", {
          titleEn: "Do you work remotely?",
          titleFr: "Travaillez-vous à distance ?",
          descEn: "Yes, with clear communication and regular progress reports.",
          descFr: "Oui, avec une communication claire et des rapports réguliers.",
        }),
        item("هل يمكن البدء بمرحلة تجريبية؟", "بالتأكيد — نبدأ باكتشاف أو نموذج أولي قابل للقياس.", {
          titleEn: "Can we start with a pilot?",
          titleFr: "Peut-on commencer par un pilote ?",
          descEn: "Absolutely — we start with discovery or a measurable prototype.",
          descFr: "Bien sûr — nous démarrons par une découverte ou un prototype.",
        }),
      ],
    },
    quote: {
      nav_label: localized(""),
      eyebrow: localized("رؤية", "Vision", "Vision"),
      title: localized(
        "المنتج الجيد لا يُبنى بالصدفة — يُبنى بقياس وقرار.",
        "Great products are built with measurement and decisions — not chance.",
        "Un bon produit se construit par la mesure et la décision.",
      ),
      subtitle: localized("Samaa Dev", "Samaa Dev", "Samaa Dev"),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "navy",
      show_in_nav: false,
      items: [],
    },
    type_canvas: {
      nav_label: localized("بيان", "Manifesto", "Manifeste"),
      eyebrow: localized("Samaa Dev", "Samaa Dev", "Samaa Dev"),
      title: localized("نبني ما يُرى", "We build what shows", "Nous construisons le visible"),
      subtitle: localized("من الفكرة إلى الشاشة", "From idea to screen", "De l’idée à l’écran"),
      body: localized(
        "عنوان يملأ المساحة — والتعليق يبقى هادئاً في الزاوية.",
        "A title that fills the space — a quiet caption in the corner.",
        "Un titre qui remplit l’espace — une légende discrète au coin.",
      ),
      cta_label: localized("اكتشف المزيد", "Explore", "Découvrir"),
      cta_href: "/contact",
      variant: "navy",
      show_in_nav: true,
      items: [],
    },
    offset_story: {
      nav_label: localized("الحكاية", "Story", "Récit"),
      eyebrow: localized("٠١ / حكاية", "01 / Story", "01 / Récit"),
      title: localized(
        "التصميم ليس زينة",
        "Design is not decoration",
        "Le design n’est pas décoratif",
      ),
      subtitle: localized(""),
      body: localized(
        "نضع النص حيث يُقرأ — لا حيث يتوقع المشاهد. العنوان هنا، والمعنى هناك، والمسافة بينهما جزء من الرسالة.",
        "We place copy where it is read — not where it is expected. Title here, meaning there; the gap is part of the message.",
        "Nous plaçons le texte où il se lit — pas où on l’attend. Titre ici, sens ailleurs ; l’écart fait partie du message.",
      ),
      cta_label: localized("اقرأ القصة", "Read the story", "Lire le récit"),
      cta_href: "/contact",
      variant: "light",
      show_in_nav: true,
      items: [],
    },
    word_ladder: {
      nav_label: localized("كلمات", "Words", "Mots"),
      eyebrow: localized("سلم", "Ladder", "Échelle"),
      title: localized("من الهمسة إلى الصرخة", "From whisper to roar", "Du murmure au cri"),
      subtitle: localized("كل كلمة أكبر من التي قبلها", "Each word larger than the last", "Chaque mot plus grand"),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "muted",
      show_in_nav: true,
      items: [
        item("فكّر", "", { titleEn: "Think", titleFr: "Penser" }),
        item("صمّم", "", { titleEn: "Design", titleFr: "Designer" }),
        item("ابنِ", "", { titleEn: "Build", titleFr: "Construire" }),
        item("أطلِق", "", { titleEn: "Ship", titleFr: "Livrer" }),
        item("نمِّ", "", { titleEn: "Grow", titleFr: "Grandir" }),
      ],
    },
    editorial: {
      nav_label: localized("مقال", "Editorial", "Édito"),
      eyebrow: localized("افتتاحية", "Opener", "Édito"),
      title: localized("المنتج لغة", "Product is language", "Le produit est un langage"),
      subtitle: localized("عدد خاص — تصميم وطباعة", "Special issue — type & layout", "Numéro spécial — typo & mise en page"),
      body: localized(
        "نكتب الواجهة كما تُكتب المقالة: إيقاع، فراغ، وقرار واضح أين يتوقف النظر. الحرف الأول كبير لأن البداية تستحق وقفة — والعمود الضيق يجبر السطر على التنفّس.",
        "We write interfaces like essays: rhythm, space, and a clear place for the eye to rest. The opening letter is large because beginnings deserve a pause — and a narrow column lets each line breathe.",
        "Nous écrivons l’interface comme un essai : rythme, espace, et un lieu clair pour le regard. La lettre d’ouverture est grande car les débuts méritent une pause.",
      ),
      cta_label: localized("المزيد", "More", "Suite"),
      cta_href: "/contact",
      variant: "light",
      show_in_nav: true,
      items: [],
    },
    quote_mosaic: {
      nav_label: localized("شذرات", "Fragments", "Fragments"),
      eyebrow: localized("فسيفساء", "Mosaic", "Mosaïque"),
      title: localized("كلمات متناثرة بقصد", "Scattered words, on purpose", "Des mots épars, volontairement"),
      subtitle: localized("حرّك العين — لا تُثبّتها", "Move the eye — don’t pin it", "Faire bouger le regard"),
      body: localized(""),
      cta_label: localized(""),
      cta_href: "/contact",
      variant: "navy",
      show_in_nav: true,
      items: [
        item("وضوح", "قبل الزخرفة", {
          titleEn: "Clarity",
          titleFr: "Clarté",
          descEn: "Before ornament",
          descFr: "Avant l’ornement",
        }),
        item("إيقاع", "في المسافات", {
          titleEn: "Rhythm",
          titleFr: "Rythme",
          descEn: "In the gaps",
          descFr: "Dans les silences",
        }),
        item("جرأة", "في الحجم", {
          titleEn: "Bold scale",
          titleFr: "Audace",
          descEn: "In the size",
          descFr: "Dans la taille",
        }),
        item("هدوء", "في الزاوية", {
          titleEn: "Quiet",
          titleFr: "Calme",
          descEn: "In the corner",
          descFr: "Dans le coin",
        }),
        item("أثر", "بعد الإطلاق", {
          titleEn: "Impact",
          titleFr: "Impact",
          descEn: "After launch",
          descFr: "Après le lancement",
        }),
      ],
    },
    overlay_caption: {
      nav_label: localized("مشهد", "Scene", "Scène"),
      eyebrow: localized("خلف الكواليس", "Behind the scene", "Coulisses"),
      title: localized("الصورة تتكلم — والنص يوجّه", "Image speaks — copy steers", "L’image parle — le texte guide"),
      subtitle: localized("تعليق في الزاوية، عنوان على الحافة", "Caption in the corner, title on the edge", "Légende au coin, titre en bordure"),
      body: localized(
        "استخدم صورة قوية ثم ضع النص حيث لا يغطي الوجه البصري — أعلى، أسفل، أو حافة.",
        "Use a strong image, then place copy where it doesn’t cover the visual focus — top, bottom, or edge.",
        "Une image forte, puis le texte hors du point focal — haut, bas ou bord.",
      ),
      cta_label: localized("شاهد العمل", "See work", "Voir le travail"),
      cta_href: "/case-studies",
      variant: "navy",
      show_in_nav: true,
      items: [],
    },
  };

  const s = starters[template];
  return {
    ...blankBase({ ...s, ...overrides }),
    kind: "custom",
    template,
  };
}

export function sectionDisplayName(section: SitePageSection): string {
  if (section.kind === "system" && section.system_key) {
    return SITE_SYSTEM_LABELS[section.system_key];
  }
  if (section.template !== "system") {
    const title = pick(section.title, "ar");
    return title || SITE_CUSTOM_TEMPLATE_LABELS[section.template] || "قسم مخصص";
  }
  return pick(section.title, "ar") || pick(section.nav_label, "ar") || "قسم";
}

export function sectionAnchor(section: SitePageSection): string {
  if (section.kind === "system" && section.system_key) {
    return SITE_SYSTEM_ANCHORS[section.system_key];
  }
  return `block-${section.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "x"}`;
}

export function orderedPageSections(layout: SiteLayoutSettings): SitePageSection[] {
  return [...layout.sections].sort((a, b) => a.sort_order - b.sort_order);
}

export function createDefaultLayout(): SiteLayoutSettings {
  return {
    sections: SITE_SYSTEM_KEYS.map((key, i) => createSystemSection(key, { sort_order: i })),
  };
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asL(v: unknown, fallback: LocalizedString | string = ""): LocalizedString {
  return asLocalized(v, fallback);
}

function asItems(v: unknown): SiteSectionItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => x && typeof x === "object")
    .map((x, i) => {
      const row = x as Record<string, unknown>;
      const item: SiteSectionItem = {
        id: asString(row["id"], `it_${i}`),
        title: asL(row["title"]),
        description: asL(row["description"]),
      };
      if (typeof row["icon"] === "string") item.icon = row["icon"];
      if (typeof row["value"] === "string") item.value = row["value"];
      if (typeof row["image_url"] === "string") item.image_url = row["image_url"];
      else if (row["image_url"] === null) item.image_url = null;
      return item;
    });
}

export function normalizePageSection(
  raw: Record<string, unknown>,
  index: number,
): SitePageSection | null {
  const id = asString(raw["id"]);
  if (!id) return null;

  if (
    SITE_SYSTEM_KEYS.includes(id as SiteSystemKey) &&
    raw["kind"] !== "system" &&
    raw["kind"] !== "custom"
  ) {
    const key = id as SiteSystemKey;
    return createSystemSection(key, {
      visible: asBool(raw["visible"], true),
      sort_order: typeof raw["sort_order"] === "number" ? raw["sort_order"] : index,
      nav_label: asL(raw["nav_label"], SYSTEM_DEFAULTS[key].nav_label),
      eyebrow: asL(raw["eyebrow"], SYSTEM_DEFAULTS[key].eyebrow),
      title: asL(raw["title"], SYSTEM_DEFAULTS[key].title),
      subtitle: asL(raw["subtitle"], SYSTEM_DEFAULTS[key].subtitle),
    });
  }

  const kind = raw["kind"] === "custom" ? "custom" : "system";
  if (kind === "system") {
    const key = (asString(raw["system_key"]) || id.replace(/^sys_/, "")) as SiteSystemKey;
    if (!SITE_SYSTEM_KEYS.includes(key)) return null;
    return createSystemSection(key, {
      id,
      visible: asBool(raw["visible"], true),
      sort_order: typeof raw["sort_order"] === "number" ? raw["sort_order"] : index,
      show_in_nav: asBool(raw["show_in_nav"], true),
      nav_label: asL(raw["nav_label"], SYSTEM_DEFAULTS[key].nav_label),
      eyebrow: asL(raw["eyebrow"], SYSTEM_DEFAULTS[key].eyebrow),
      title: asL(raw["title"], SYSTEM_DEFAULTS[key].title),
      subtitle: asL(raw["subtitle"], SYSTEM_DEFAULTS[key].subtitle),
    });
  }

  const template = asString(raw["template"], "feature_cards") as SiteCustomTemplate;
  const safeTemplate = (Object.keys(SITE_CUSTOM_TEMPLATE_LABELS) as SiteCustomTemplate[]).includes(
    template,
  )
    ? template
    : "feature_cards";

  const variantRaw = asString(raw["variant"], "light") as SiteSectionVariant;
  const variant = (["light", "muted", "navy", "brand"] as SiteSectionVariant[]).includes(variantRaw)
    ? variantRaw
    : "light";

  let ctaHref = asString(raw["cta_href"], "/contact");
  if (ctaHref.startsWith("#")) ctaHref = `/${ctaHref.slice(1)}`;

  return {
    id,
    kind: "custom",
    template: safeTemplate,
    visible: asBool(raw["visible"], true),
    sort_order: typeof raw["sort_order"] === "number" ? raw["sort_order"] : index,
    show_in_nav: asBool(raw["show_in_nav"], true),
    nav_label: asL(raw["nav_label"]),
    eyebrow: asL(raw["eyebrow"]),
    title: asL(raw["title"]),
    subtitle: asL(raw["subtitle"]),
    body: asL(raw["body"]),
    image_url:
      typeof raw["image_url"] === "string"
        ? raw["image_url"]
        : raw["image_url"] === null
          ? null
          : null,
    cta_label: asL(raw["cta_label"]),
    cta_href: ctaHref || "/contact",
    variant,
    items: asItems(raw["items"]),
  };
}

export function parseLayout(data: Record<string, unknown> | undefined): SiteLayoutSettings {
  const raw = data?.["sections"];
  if (!Array.isArray(raw) || raw.length === 0) return createDefaultLayout();
  const sections = raw
    .map((item, i) =>
      item && typeof item === "object"
        ? normalizePageSection(item as Record<string, unknown>, i)
        : null,
    )
    .filter((s): s is SitePageSection => Boolean(s))
    .map((s, i) => ({ ...s, sort_order: i }));
  return sections.length ? { sections } : createDefaultLayout();
}
