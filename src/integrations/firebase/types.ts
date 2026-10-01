export type AppRole = "admin" | "manager" | "developer";

export type Profile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoles = {
  id: string;
  roles: AppRole[];
  created_at: string;
};

export type ClientContact = {
  client_id: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  satisfaction: number | null;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  name: string;
  company: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  client_id: string | null;
  scope_of_work: string | null;
  budget: number;
  start_date: string | null;
  deadline: string | null;
  status: string;
  priority: string;
  /** Operational board lane on /overview (independent of status). */
  board_stage?: string | null;
  /** Manual progress 0–100 for /overview (not derived from tasks/payments). */
  progress_percent?: number | null;
  /** auto = from tasks/milestones; manual = use progress_percent. */
  progress_mode?: string | null;
  /** Sort order within an overview board column. */
  board_position?: number | null;
  /** Short operational note shown on /overview hover. */
  board_note?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: string;
  project_id: string;
  kind: string;
  label: string;
  url: string;
  created_at: string;
};

export type Sprint = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  /** Operational board lane on /overview (waiting | active_work | in_review | completed). */
  board_stage?: string | null;
  /** auto = from tasks; manual = use progress_percent. */
  progress_mode?: string | null;
  progress_percent?: number | null;
  /** Sort order within an overview board column. */
  board_position?: number | null;
  /** Short operational note shown on /overview hover. */
  board_note?: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  assignee_id: string | null;
  estimated_hours: number;
  actual_hours: number;
  due_date: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TxType = "general" | "project_payment" | "payroll" | "company_expense";
export type PaymentStatus = "planned" | "invoiced" | "paid" | "overdue";
export type ExpenseScope = "company" | "project";
export type PaymentMethod = "bank_transfer" | "cash" | "ccp" | "paypal" | "other";
export type EmploymentType = "full_time" | "part_time" | "contract";

export type Transaction = {
  id: string;
  kind: string;
  amount: number;
  category: string | null;
  description: string | null;
  occurred_on: string;
  due_date: string | null;
  is_paid: boolean;
  client_id: string | null;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Defaults to "general" for legacy docs. */
  tx_type?: TxType;
  milestone_id?: string | null;
  invoice_number?: string | null;
  payment_method?: PaymentMethod | null;
  reference?: string | null;
  tax_amount?: number | null;
  payment_status?: PaymentStatus | null;
  payee_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  base_amount?: number | null;
  bonus?: number | null;
  deductions?: number | null;
  expense_scope?: ExpenseScope | null;
  vendor?: string | null;
};

export type PayrollProfile = {
  id: string;
  monthly_salary: number | null;
  employment_type: EmploymentType | null;
  notes: string | null;
  updated_at: string;
};

export type KpiFormat = "currency" | "number" | "percent";

export type KpiWidgetConfig = {
  id: string;
  enabled: boolean;
  order: number;
  label?: string;
  target?: number | null;
  manual_value?: number | null;
  format?: KpiFormat;
  show_target_bar?: boolean;
};

export type KpiSettings = {
  updated_at: string;
  updated_by: string | null;
  widgets: KpiWidgetConfig[];
};

/* ── Public website CMS (site_*) — separate from operational projects ── */

export type SiteProjectStatus = "published" | "draft";
export type SiteLeadStatus = "new" | "in_progress" | "completed";

/** Multilingual CMS string (ar/en/fr). */
export type SiteLocalizedString = {
  ar: string;
  en: string;
  fr: string;
};

export type SiteImpactMetric = { label: SiteLocalizedString | string; value: string };

export type SiteServiceItem = {
  title: string;
  description: string;
  icon: string;
  subtitle?: string;
  tags?: string[];
};

export type SiteHeroSettings = {
  headline: string;
  subtitle: string;
  cta_label: string;
  projects_count: string;
  satisfaction: string;
  experience_years: string;
};

export type SiteContactSettings = {
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
};

export type SiteSocialSettings = {
  linkedin: string;
  github: string;
  instagram: string;
  twitter: string;
};

export type SiteAboutSettings = {
  text: string;
};

export type SiteServicesSettings = {
  items: SiteServiceItem[];
};

export type SiteSettingsMap = {
  hero: SiteHeroSettings;
  contact: SiteContactSettings;
  social: SiteSocialSettings;
  about: SiteAboutSettings;
  services: SiteServicesSettings;
};

export type SiteCategory = {
  id: string;
  slug: string;
  label: SiteLocalizedString | string;
  sort_order: number;
  created_at: string;
};

export type SiteProject = {
  id: string;
  title: SiteLocalizedString;
  slug: string;
  category: string;
  short_description: SiteLocalizedString;
  detailed_description: SiteLocalizedString;
  client_name: SiteLocalizedString;
  challenge: SiteLocalizedString;
  solution: SiteLocalizedString;
  results: SiteLocalizedString;
  timeline: SiteLocalizedString;
  tech_stack: string[];
  cover_image_url: string | null;
  cover_video_url: string | null;
  cover_prefer_video: boolean;
  gallery_urls: string[];
  impact_metrics: SiteImpactMetric[];
  live_url: string | null;
  playstore_url: string | null;
  appstore_url: string | null;
  is_featured: boolean;
  status: SiteProjectStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SiteTestimonial = {
  id: string;
  client_name: SiteLocalizedString;
  client_role: SiteLocalizedString;
  company_name: SiteLocalizedString;
  avatar_url: string | null;
  quote_text: SiteLocalizedString;
  rating: number;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
};

export type SiteLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_type: string;
  project_details: string;
  status: SiteLeadStatus;
  created_at: string;
};

export type SiteAuditLeadStatus = "in_progress" | "new" | "contacted" | "qualified" | "closed";

export type LandingOption = {
  id: string;
  short: string;
  label: string;
};

export type LandingAuditSettings = {
  welcome_title: string;
  welcome_subtitle: string;
  business_types: LandingOption[];
  monthly_volumes: LandingOption[];
  team_sizes: LandingOption[];
  challenges: LandingOption[];
  volume_title: string;
  volume_subtitle: string;
  team_title: string;
  team_subtitle: string;
  challenges_title: string;
  challenges_subtitle: string;
  contact_title: string;
  contact_subtitle: string;
  updated_at?: string;
};

export type SiteAuditLead = {
  id: string;
  name: string;
  whatsapp: string;
  business_type: string;
  monthly_volume: string;
  team_size: string;
  challenges: string[];
  status: SiteAuditLeadStatus;
  source: "audit_landing";
  created_at: string;
  updated_at: string;
  notes: string;
  step_reached: number;
  step_label: string;
  completed: boolean;
  visitor_key: string;
  is_repeat: boolean;
};

export type SiteTeamRoleType = "manager" | "employee";
export type SiteTeamPageTemplate = "portrait" | "split" | "editorial" | "minimal";
export type SiteTeamCardStyle = "photo" | "classic" | "compact" | "featured";
export type SiteTeamCtaMode = "book_call" | "whatsapp" | "contact" | "custom" | "none";

export const SITE_TEAM_PAGE_TEMPLATE_LABELS: Record<SiteTeamPageTemplate, string> = {
  portrait: "عمودي بارز",
  split: "صورة ونص متوازيان",
  editorial: "افتتاحي إبداعي",
  minimal: "Minimal نظيف",
};

export const SITE_TEAM_CARD_STYLE_LABELS: Record<SiteTeamCardStyle, string> = {
  photo: "صورة كبيرة",
  classic: "كلاسيكي",
  compact: "مضغوط",
  featured: "مميز",
};

export type SiteTeamMember = {
  id: string;
  name: string;
  slug: string;
  role_title: SiteLocalizedString;
  role_type: SiteTeamRoleType;
  specialty: SiteLocalizedString;
  bio: SiteLocalizedString;
  long_bio: SiteLocalizedString;
  highlight_quote: SiteLocalizedString;
  avatar_url: string | null;
  cover_image_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  email: string | null;
  website_url: string | null;
  whatsapp: string | null;
  skills: string[];
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
  page_cta_label: SiteLocalizedString;
  page_cta_url: string | null;
  sort_order: number;
  created_at: string;
};

export type DiagnosticFieldType =
  | "single_choice"
  | "multi_choice"
  | "text"
  | "name"
  | "company"
  | "email"
  | "phone"
  | "url";

export type DiagnosticOption = {
  id: string;
  label: string;
};

export type DiagnosticField = {
  id: string;
  type: DiagnosticFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  sort_order: number;
  options?: DiagnosticOption[];
};

export type DiagnosticStep = {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  fields: DiagnosticField[];
};

export type SiteDiagnosticSettings = {
  badge_text: string;
  brand_label: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_microcopy: string;
  video_url: string;
  video_poster_url: string;
  scroll_hint: string;
  works_eyebrow: string;
  works_title: string;
  works_subtitle: string;
  works_cta_microcopy: string;
  works_empty: string;
  closing_title: string;
  closing_description: string;
  float_hint: string;
  wizard_title: string;
  proof_enabled: boolean;
  proof_metric: string;
  proof_quote: string;
  proof_author: string;
  thanks_title: string;
  thanks_description: string;
  whatsapp_phone: string;
  whatsapp_message_template: string;
  steps: DiagnosticStep[];
  /** Bump when default funnel questions change; stale Firestore steps are ignored. */
  funnel_version?: number;
  updated_at?: string;
};

export type SiteDiagnosticLeadStatus = "new" | "contacted" | "qualified" | "closed";

export type DiagnosticAnswerSnapshot = {
  question_id: string;
  question_text: string;
  answer: string;
};

export type SiteDiagnosticLeadUtm = {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
};

export type SiteDiagnosticFunnelStatus = "in_progress" | "completed" | "left_to_idea";

export type SiteDiagnosticLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  answers_snapshot: DiagnosticAnswerSnapshot[];
  status: SiteDiagnosticLeadStatus;
  /** diagnose = قمع الشركة القائمة · idea_consult = مسار الفكرة */
  source: "diagnose" | "idea_consult";
  service?: string;
  price_dzd?: number;
  /** Attribution from ad landing URL (?utm_source=&utm_campaign=…) */
  utm?: SiteDiagnosticLeadUtm;
  /** Progress through the funnel; missing on older leads = treat as completed */
  funnel_status?: SiteDiagnosticFunnelStatus;
  last_step_index?: number;
  last_step_id?: string;
  last_step_title?: string;
  steps_total?: number;
  updated_at?: string;
  /** Soft-delete: hidden from default list, recoverable */
  archived?: boolean;
  archived_at?: string;
  created_at: string;
};
