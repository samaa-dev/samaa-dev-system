import { queryOptions } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";

import { getDb } from "@/integrations/firebase/client";
import { docsToRows, docToRow, newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type {
  Client,
  ClientContact,
  DiagnosticField,
  DiagnosticOption,
  DiagnosticStep,
  KpiSettings,
  Milestone,
  PayrollProfile,
  Profile,
  Project,
  Resource,
  SiteAboutSettings,
  SiteCategory,
  SiteContactSettings,
  SiteDiagnosticLead,
  SiteDiagnosticSettings,
  SiteHeroSettings,
  SiteLead,
  SiteAuditLead,
  LandingAuditSettings,
  LandingOption,
  SiteProject,
  SiteServicesSettings,
  SiteSocialSettings,
  SiteTeamMember,
  SiteTestimonial,
  Sprint,
  Task,
  Transaction,
  UserRoles,
} from "@/integrations/firebase/types";
import {
  DEFAULT_SITE_ABOUT,
  DEFAULT_SITE_CATEGORIES,
  DEFAULT_SITE_CONTACT,
  DEFAULT_SITE_HERO,
  DEFAULT_SITE_SERVICES,
  DEFAULT_SITE_SOCIAL,
  DEFAULT_LANDING_AUDIT,
} from "@/lib/site-defaults";
import { DEFAULT_SITE_DIAGNOSTIC } from "@/lib/diagnostic-defaults";
import { createDefaultLayout, parseLayout, type SiteLayoutSettings } from "@/lib/site-sections";
import {
  localizeCategoryRow,
  localizeProjectRow,
  localizeTestimonialRow,
  textOf,
} from "@/lib/site-localize";
import { asLocalized } from "@/lib/i18n/localized";

export type {
  Client,
  ClientContact,
  Milestone,
  PayrollProfile,
  Profile,
  Project,
  Resource,
  SiteCategory,
  SiteLead,
  SiteAuditLead,
  LandingAuditSettings,
  SiteDiagnosticLead,
  SiteDiagnosticSettings,
  SiteProject,
  SiteTeamMember,
  SiteTestimonial,
  Sprint,
  Task,
  Transaction,
};

export const clientsQuery = () =>
  queryOptions({
    queryKey: ["clients"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(query(collection(getDb(), "clients"), orderBy("created_at", "desc")));
        return docsToRows<Client>(snap.docs);
      }),
  });

/** Sensitive client contact details — readable only by staff (admin/manager). */
export const clientContactsQuery = () =>
  queryOptions({
    queryKey: ["client-contacts"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(collection(getDb(), "client_contacts"));
        return snap.docs.map((d) => {
          const data = d.data() as Omit<ClientContact, "client_id">;
          return {
            client_id: d.id,
            email: data.email ?? null,
            phone: data.phone ?? null,
            notes: data.notes ?? null,
            satisfaction: data.satisfaction ?? null,
            created_at: data.created_at,
            updated_at: data.updated_at,
          } satisfies ClientContact;
        });
      }),
  });

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(query(collection(getDb(), "projects"), orderBy("created_at", "desc")));
        return docsToRows<Project>(snap.docs);
      }),
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "projects", id));
        return docToRow<Project>(snap);
      }),
  });

export const milestonesQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["milestones", projectId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "milestones");
        const q = projectId
          ? query(col, where("project_id", "==", projectId), orderBy("due_date", "asc"))
          : query(col, orderBy("due_date", "asc"));
        const snap = await getDocs(q);
        return docsToRows<Milestone>(snap.docs);
      }),
  });

export const resourcesQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["resources", projectId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "project_resources"),
            where("project_id", "==", projectId),
            orderBy("created_at", "asc"),
          ),
        );
        return docsToRows<Resource>(snap.docs);
      }),
  });

export const sprintsQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["sprints", projectId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "sprints");
        const q = projectId
          ? query(col, where("project_id", "==", projectId), orderBy("start_date", "desc"))
          : query(col, orderBy("start_date", "desc"));
        const snap = await getDocs(q);
        return docsToRows<Sprint>(snap.docs);
      }),
  });

export const sprintQuery = (id: string) =>
  queryOptions({
    queryKey: ["sprints", id],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "sprints", id));
        return docToRow<Sprint>(snap);
      }),
  });

export const kpiSettingsQuery = () =>
  queryOptions({
    queryKey: ["kpi-settings"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "settings", "kpis"));
        if (!snap.exists()) return null;
        return snap.data() as KpiSettings;
      }),
  });

export const tasksQuery = (filters?: { projectId?: string; sprintId?: string }) =>
  queryOptions({
    queryKey: ["tasks", filters?.projectId ?? "all", filters?.sprintId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "tasks");
        let q;
        if (filters?.projectId && filters?.sprintId) {
          q = query(
            col,
            where("project_id", "==", filters.projectId),
            where("sprint_id", "==", filters.sprintId),
            orderBy("position", "asc"),
          );
        } else if (filters?.projectId) {
          q = query(col, where("project_id", "==", filters.projectId), orderBy("position", "asc"));
        } else if (filters?.sprintId) {
          q = query(col, where("sprint_id", "==", filters.sprintId), orderBy("position", "asc"));
        } else {
          q = query(col, orderBy("position", "asc"));
        }
        const snap = await getDocs(q);
        return docsToRows<Task>(snap.docs);
      }),
  });

export const transactionsQuery = () =>
  queryOptions({
    queryKey: ["transactions"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "transactions"), orderBy("occurred_on", "desc")),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

export const transactionsByProjectQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["transactions", "project", projectId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "transactions"),
            where("project_id", "==", projectId),
            orderBy("occurred_on", "desc"),
          ),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

/** Payroll rows: staff can omit userId to load all via transactionsQuery filter client-side,
 * or pass userId for a member's own payroll (rules allow get/list of own payee_id docs). */
export const payrollTransactionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["transactions", "payroll", userId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "transactions"),
            where("payee_id", "==", userId),
            where("tx_type", "==", "payroll"),
            orderBy("occurred_on", "desc"),
          ),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

export const payrollProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["payroll-profiles", userId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "payroll_profiles", userId));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as PayrollProfile;
      }),
  });

export const payrollProfilesQuery = () =>
  queryOptions({
    queryKey: ["payroll-profiles"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(collection(getDb(), "payroll_profiles"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PayrollProfile);
      }),
  });

export const teamQuery = () =>
  queryOptions({
    queryKey: ["team"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const [profilesSnap, rolesSnap] = await Promise.all([
          getDocs(query(collection(getDb(), "profiles"), orderBy("created_at", "asc"))),
          getDocs(collection(getDb(), "user_roles")),
        ]);
        const rolesByUser = new Map<string, string[]>();
        for (const d of rolesSnap.docs) {
          const data = d.data() as UserRoles;
          rolesByUser.set(d.id, (data.roles ?? []) as string[]);
        }
        return docsToRows<Profile>(profilesSnap.docs).map((p) => ({
          ...p,
          roles: rolesByUser.get(p.id) ?? [],
        }));
      }),
  });

/** Completion percentage of a project from its tasks and milestones. */
export function projectProgress(tasks: Task[], milestones: Milestone[]) {
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.status === "done").length;
  const msTotal = milestones.length;
  const msDone = milestones.filter((m) => m.is_completed).length;
  if (!taskTotal && !msTotal) return 0;
  const taskPart = taskTotal ? taskDone / taskTotal : null;
  const msPart = msTotal ? msDone / msTotal : null;
  const parts = [taskPart, msPart].filter((p): p is number => p !== null);
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

/** Sprint progress: auto from tasks, or stored manual percent. */
export function sprintProgress(
  sprint: Pick<Sprint, "id" | "progress_mode" | "progress_percent">,
  tasks: Task[],
) {
  const mode = sprint.progress_mode === "manual" ? "manual" : "auto";
  if (mode === "manual") {
    const n = Number(sprint.progress_percent ?? 0);
    return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
  }
  const items = tasks.filter((t) => t.sprint_id === sprint.id);
  if (!items.length) return 0;
  const done = items.filter((t) => t.status === "done").length;
  return Math.round((done / items.length) * 100);
}

export function projectManualProgress(project: Pick<Project, "progress_percent">) {
  const n = Number(project.progress_percent ?? 0);
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
}

/** Project progress: auto from tasks/milestones, or stored manual percent. */
export function resolveProjectProgress(
  project: Pick<Project, "id" | "progress_mode" | "progress_percent">,
  tasks: Task[],
  milestones: Milestone[],
) {
  const mode = project.progress_mode === "manual" ? "manual" : "auto";
  if (mode === "manual") return projectManualProgress(project);
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const projectMilestones = milestones.filter((m) => m.project_id === project.id);
  return projectProgress(projectTasks, projectMilestones);
}

/* ── Website CMS queries (site_*) ── */

function asHero(data: Record<string, unknown> | undefined): SiteHeroSettings {
  return {
    headline: typeof data?.["headline"] === "string" ? data["headline"] : DEFAULT_SITE_HERO.headline,
    subtitle: typeof data?.["subtitle"] === "string" ? data["subtitle"] : DEFAULT_SITE_HERO.subtitle,
    cta_label:
      typeof data?.["cta_label"] === "string" ? data["cta_label"] : DEFAULT_SITE_HERO.cta_label,
    projects_count:
      typeof data?.["projects_count"] === "string"
        ? data["projects_count"]
        : DEFAULT_SITE_HERO.projects_count,
    satisfaction:
      typeof data?.["satisfaction"] === "string"
        ? data["satisfaction"]
        : DEFAULT_SITE_HERO.satisfaction,
    experience_years:
      typeof data?.["experience_years"] === "string"
        ? data["experience_years"]
        : DEFAULT_SITE_HERO.experience_years,
  };
}

function asContact(data: Record<string, unknown> | undefined): SiteContactSettings {
  return {
    whatsapp: typeof data?.["whatsapp"] === "string" ? data["whatsapp"] : DEFAULT_SITE_CONTACT.whatsapp,
    email: typeof data?.["email"] === "string" ? data["email"] : DEFAULT_SITE_CONTACT.email,
    phone: typeof data?.["phone"] === "string" ? data["phone"] : DEFAULT_SITE_CONTACT.phone,
    address: typeof data?.["address"] === "string" ? data["address"] : DEFAULT_SITE_CONTACT.address,
  };
}

function asSocial(data: Record<string, unknown> | undefined): SiteSocialSettings {
  return {
    linkedin: typeof data?.["linkedin"] === "string" ? data["linkedin"] : DEFAULT_SITE_SOCIAL.linkedin,
    github: typeof data?.["github"] === "string" ? data["github"] : DEFAULT_SITE_SOCIAL.github,
    instagram:
      typeof data?.["instagram"] === "string" ? data["instagram"] : DEFAULT_SITE_SOCIAL.instagram,
    twitter: typeof data?.["twitter"] === "string" ? data["twitter"] : DEFAULT_SITE_SOCIAL.twitter,
  };
}

function asAbout(data: Record<string, unknown> | undefined): SiteAboutSettings {
  return {
    text: typeof data?.["text"] === "string" ? data["text"] : DEFAULT_SITE_ABOUT.text,
  };
}

function asServices(data: Record<string, unknown> | undefined): SiteServicesSettings {
  const items = data?.["items"];
  if (Array.isArray(items) && items.length) {
    return { items: items as SiteServicesSettings["items"] };
  }
  return DEFAULT_SITE_SERVICES;
}

export type SiteSettingsBundle = {
  hero: SiteHeroSettings;
  contact: SiteContactSettings;
  social: SiteSocialSettings;
  about: SiteAboutSettings;
  services: SiteServicesSettings;
  layout: SiteLayoutSettings;
};

export const siteSettingsQuery = () =>
  queryOptions({
    queryKey: ["site-settings"],
    queryFn: async (): Promise<SiteSettingsBundle> =>
      withFirebaseError(async () => {
        const keys = ["hero", "contact", "social", "about", "services", "layout"] as const;
        const snaps = await Promise.all(
          keys.map((key) => getDoc(doc(getDb(), "site_settings", key))),
        );
        const map: Record<string, Record<string, unknown>> = {};
        snaps.forEach((snap, i) => {
          if (snap.exists()) map[keys[i]!] = snap.data() as Record<string, unknown>;
        });
        return {
          hero: asHero(map["hero"]),
          contact: asContact(map["contact"]),
          social: asSocial(map["social"]),
          about: asAbout(map["about"]),
          services: asServices(map["services"]),
          layout: parseLayout(map["layout"]),
        };
      }),
  });

/** Seed default site_settings + categories if empty. Safe to call repeatedly. */
export async function ensureSiteDefaults() {
  return withFirebaseError(async () => {
    const heroSnap = await getDoc(doc(getDb(), "site_settings", "hero"));
    if (!heroSnap.exists()) {
      const now = nowIso();
      await Promise.all([
        setDoc(doc(getDb(), "site_settings", "hero"), { ...DEFAULT_SITE_HERO, updated_at: now }),
        setDoc(doc(getDb(), "site_settings", "contact"), {
          ...DEFAULT_SITE_CONTACT,
          updated_at: now,
        }),
        setDoc(doc(getDb(), "site_settings", "social"), {
          ...DEFAULT_SITE_SOCIAL,
          updated_at: now,
        }),
        setDoc(doc(getDb(), "site_settings", "about"), { ...DEFAULT_SITE_ABOUT, updated_at: now }),
        setDoc(doc(getDb(), "site_settings", "services"), {
          ...DEFAULT_SITE_SERVICES,
          updated_at: now,
        }),
      ]);
    }

    const catSnap = await getDocs(collection(getDb(), "site_categories"));
    if (catSnap.empty) {
      const now = nowIso();
      await Promise.all(
        DEFAULT_SITE_CATEGORIES.map((c) => {
          const id = newId();
          return setDoc(doc(getDb(), "site_categories", id), {
            slug: c.slug,
            label: c.label,
            sort_order: c.sort_order,
            created_at: now,
          });
        }),
      );
    }

    const diagnosticSnap = await getDoc(doc(getDb(), "site_settings", "diagnostic"));
    if (!diagnosticSnap.exists()) {
      await setDoc(doc(getDb(), "site_settings", "diagnostic"), {
        ...DEFAULT_SITE_DIAGNOSTIC,
        updated_at: nowIso(),
      });
    }

    const layoutSnap = await getDoc(doc(getDb(), "site_settings", "layout"));
    if (!layoutSnap.exists()) {
      await setDoc(doc(getDb(), "site_settings", "layout"), {
        ...createDefaultLayout(),
        updated_at: nowIso(),
      });
    }
  });
}

function asLandingOptions(raw: unknown, fallback: LandingOption[]): LandingOption[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback.map((o) => ({ ...o }));
  const parsed: LandingOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row["id"] === "string" ? row["id"].trim() : "";
    const short = typeof row["short"] === "string" ? row["short"].trim() : "";
    const label = typeof row["label"] === "string" ? row["label"].trim() : short;
    if (!id || !short) continue;
    parsed.push({ id: id.slice(0, 40), short: short.slice(0, 80), label: label.slice(0, 160) });
  }
  return parsed.length ? parsed : fallback.map((o) => ({ ...o }));
}

export function asLandingAuditSettings(
  data: Record<string, unknown> | undefined,
): LandingAuditSettings {
  const d = data ?? {};
  return {
    welcome_title:
      typeof d["welcome_title"] === "string" && d["welcome_title"]
        ? d["welcome_title"]
        : DEFAULT_LANDING_AUDIT.welcome_title,
    welcome_subtitle:
      typeof d["welcome_subtitle"] === "string" && d["welcome_subtitle"]
        ? d["welcome_subtitle"]
        : DEFAULT_LANDING_AUDIT.welcome_subtitle,
    business_types: asLandingOptions(d["business_types"], DEFAULT_LANDING_AUDIT.business_types),
    monthly_volumes: asLandingOptions(d["monthly_volumes"], DEFAULT_LANDING_AUDIT.monthly_volumes),
    team_sizes: asLandingOptions(d["team_sizes"], DEFAULT_LANDING_AUDIT.team_sizes),
    challenges: asLandingOptions(d["challenges"], DEFAULT_LANDING_AUDIT.challenges),
    volume_title:
      typeof d["volume_title"] === "string" && d["volume_title"]
        ? d["volume_title"]
        : DEFAULT_LANDING_AUDIT.volume_title,
    volume_subtitle:
      typeof d["volume_subtitle"] === "string" && d["volume_subtitle"]
        ? d["volume_subtitle"]
        : DEFAULT_LANDING_AUDIT.volume_subtitle,
    team_title:
      typeof d["team_title"] === "string" && d["team_title"]
        ? d["team_title"]
        : DEFAULT_LANDING_AUDIT.team_title,
    team_subtitle:
      typeof d["team_subtitle"] === "string" && d["team_subtitle"]
        ? d["team_subtitle"]
        : DEFAULT_LANDING_AUDIT.team_subtitle,
    challenges_title:
      typeof d["challenges_title"] === "string" && d["challenges_title"]
        ? d["challenges_title"]
        : DEFAULT_LANDING_AUDIT.challenges_title,
    challenges_subtitle:
      typeof d["challenges_subtitle"] === "string" && d["challenges_subtitle"]
        ? d["challenges_subtitle"]
        : DEFAULT_LANDING_AUDIT.challenges_subtitle,
    contact_title:
      typeof d["contact_title"] === "string" && d["contact_title"]
        ? d["contact_title"]
        : DEFAULT_LANDING_AUDIT.contact_title,
    contact_subtitle:
      typeof d["contact_subtitle"] === "string" && d["contact_subtitle"]
        ? d["contact_subtitle"]
        : DEFAULT_LANDING_AUDIT.contact_subtitle,
    ...(typeof d["updated_at"] === "string" ? { updated_at: d["updated_at"] } : {}),
  };
}

export async function ensureLandingAuditDefaults() {
  return withFirebaseError(async () => {
    const snap = await getDoc(doc(getDb(), "site_settings", "landing_audit"));
    if (snap.exists()) return asLandingAuditSettings(snap.data() as Record<string, unknown>);
    const now = nowIso();
    const payload = { ...DEFAULT_LANDING_AUDIT, updated_at: now };
    await setDoc(doc(getDb(), "site_settings", "landing_audit"), payload);
    return payload;
  });
}

export const landingAuditSettingsQuery = () =>
  queryOptions({
    queryKey: ["landing-audit-settings"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "site_settings", "landing_audit"));
        if (!snap.exists()) return { ...DEFAULT_LANDING_AUDIT };
        return asLandingAuditSettings(snap.data() as Record<string, unknown>);
      }),
  });

export const siteCategoriesQuery = () =>
  queryOptions({
    queryKey: ["site-categories"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_categories"), orderBy("sort_order", "asc")),
        );
        return snap.docs.map((d) => localizeCategoryRow({ id: d.id, ...d.data() }));
      }),
  });

/** All portfolio projects for admin. */
export const siteProjectsAdminQuery = () =>
  queryOptions({
    queryKey: ["site-projects", "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_projects"), orderBy("sort_order", "asc")),
        );
        return snap.docs.map((d) => localizeProjectRow({ id: d.id, ...d.data() }));
      }),
  });

/** Published portfolio projects for the public site. */
export const siteProjectsPublishedQuery = () =>
  queryOptions({
    queryKey: ["site-projects", "published"],
    queryFn: async () =>
      withFirebaseError(async () => {
        // where-only avoids requiring a composite index; sort client-side.
        const snap = await getDocs(
          query(collection(getDb(), "site_projects"), where("status", "==", "published")),
        );
        const rows = snap.docs.map((d) => localizeProjectRow({ id: d.id, ...d.data() }));
        return rows.sort((a, b) => {
          const featured = Number(b.is_featured) - Number(a.is_featured);
          if (featured !== 0) return featured;
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });
      }),
  });

export const siteTestimonialsAdminQuery = () =>
  queryOptions({
    queryKey: ["site-testimonials", "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_testimonials"), orderBy("sort_order", "asc")),
        );
        return snap.docs.map((d) => localizeTestimonialRow({ id: d.id, ...d.data() }));
      }),
  });

export const siteTestimonialsVisibleQuery = () =>
  queryOptions({
    queryKey: ["site-testimonials", "visible"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_testimonials"), where("is_visible", "==", true)),
        );
        const rows = snap.docs.map((d) => localizeTestimonialRow({ id: d.id, ...d.data() }));
        return rows.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      }),
  });

export const siteLeadsQuery = () =>
  queryOptions({
    queryKey: ["site-leads"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_leads"), orderBy("created_at", "desc")),
        );
        return docsToRows<SiteLead>(snap.docs);
      }),
  });

export const siteAuditLeadsQuery = () =>
  queryOptions({
    queryKey: ["site-audit-leads"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_audit_leads"), orderBy("created_at", "desc")),
        );
        return docsToRows<SiteAuditLead>(snap.docs);
      }),
  });

export function categoryLabel(categories: SiteCategory[] | undefined, slug: string): string {
  const found = categories?.find((c) => c.slug === slug);
  if (!found) return slug;
  return textOf(asLocalized(found.label));
}

function cloneDiagnosticDefaults(): DiagnosticStep[] {
  return structuredClone(DEFAULT_SITE_DIAGNOSTIC.steps);
}

function asDiagnosticOptions(raw: unknown): DiagnosticOption[] {
  if (!Array.isArray(raw)) return [];
  const out: DiagnosticOption[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row["id"] === "string" ? row["id"].trim() : "";
    const label = typeof row["label"] === "string" ? row["label"].trim() : "";
    if (!id || !label) continue;
    out.push({ id: id.slice(0, 60), label: label.slice(0, 200) });
  }
  return out;
}

function asDiagnosticFields(raw: unknown): DiagnosticField[] {
  if (!Array.isArray(raw)) return [];
  const out: DiagnosticField[] = [];
  const types = new Set([
    "single_choice",
    "multi_choice",
    "text",
    "name",
    "company",
    "email",
    "phone",
    "url",
  ]);
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const id = typeof row["id"] === "string" ? row["id"].trim() : "";
    const type = typeof row["type"] === "string" && types.has(row["type"]) ? row["type"] : "text";
    const label = typeof row["label"] === "string" ? row["label"].trim() : "";
    if (!id || !label) return;
    const field: DiagnosticField = {
      id: id.slice(0, 60),
      type: type as DiagnosticField["type"],
      label: label.slice(0, 240),
      required: row["required"] !== false,
      sort_order: typeof row["sort_order"] === "number" ? row["sort_order"] : index,
    };
    if (typeof row["placeholder"] === "string" && row["placeholder"].trim()) {
      field.placeholder = row["placeholder"].trim().slice(0, 200);
    }
    if (type === "single_choice" || type === "multi_choice") {
      field.options = asDiagnosticOptions(row["options"]);
    }
    out.push(field);
  });
  return out.sort((a, b) => a.sort_order - b.sort_order);
}

function asDiagnosticSteps(raw: unknown): DiagnosticStep[] {
  if (!Array.isArray(raw) || raw.length === 0) return cloneDiagnosticDefaults();
  const steps: DiagnosticStep[] = [];
  raw.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const row = item as Record<string, unknown>;
    const id = typeof row["id"] === "string" ? row["id"].trim() : "";
    const title = typeof row["title"] === "string" ? row["title"].trim() : "";
    const fields = asDiagnosticFields(row["fields"]);
    if (!id || !fields.length) return;
    steps.push({
      id: id.slice(0, 60),
      title: (title || fields[0]?.label || "خطوة").slice(0, 160),
      sort_order: typeof row["sort_order"] === "number" ? row["sort_order"] : index,
      is_active: row["is_active"] !== false,
      fields,
    });
  });
  if (!steps.length) return cloneDiagnosticDefaults();
  return steps.sort((a, b) => a.sort_order - b.sort_order);
}

export function asDiagnosticSettings(
  data: Record<string, unknown> | undefined,
): SiteDiagnosticSettings {
  const d = data ?? {};
  const str = (key: keyof SiteDiagnosticSettings, fallback: string) =>
    typeof d[key] === "string" && (d[key] as string).trim()
      ? (d[key] as string)
      : fallback;

  const currentVersion = DEFAULT_SITE_DIAGNOSTIC.funnel_version ?? 2;
  const storedVersion = typeof d["funnel_version"] === "number" ? d["funnel_version"] : 0;
  const useDefaults = storedVersion < currentVersion;
  const steps = useDefaults ? cloneDiagnosticDefaults() : asDiagnosticSteps(d["steps"]);
  const thanksTitle = useDefaults
    ? DEFAULT_SITE_DIAGNOSTIC.thanks_title
    : str("thanks_title", DEFAULT_SITE_DIAGNOSTIC.thanks_title);
  const thanksDescription = useDefaults
    ? DEFAULT_SITE_DIAGNOSTIC.thanks_description
    : str("thanks_description", DEFAULT_SITE_DIAGNOSTIC.thanks_description);

  return {
    badge_text: str("badge_text", DEFAULT_SITE_DIAGNOSTIC.badge_text),
    brand_label: str("brand_label", DEFAULT_SITE_DIAGNOSTIC.brand_label),
    headline: str("headline", DEFAULT_SITE_DIAGNOSTIC.headline),
    subheadline: str("subheadline", DEFAULT_SITE_DIAGNOSTIC.subheadline),
    cta_label: str("cta_label", DEFAULT_SITE_DIAGNOSTIC.cta_label),
    cta_microcopy: str("cta_microcopy", DEFAULT_SITE_DIAGNOSTIC.cta_microcopy),
    video_url: typeof d["video_url"] === "string" ? d["video_url"] : DEFAULT_SITE_DIAGNOSTIC.video_url,
    video_poster_url:
      typeof d["video_poster_url"] === "string"
        ? d["video_poster_url"]
        : DEFAULT_SITE_DIAGNOSTIC.video_poster_url,
    scroll_hint: str("scroll_hint", DEFAULT_SITE_DIAGNOSTIC.scroll_hint),
    works_eyebrow: str("works_eyebrow", DEFAULT_SITE_DIAGNOSTIC.works_eyebrow),
    works_title: str("works_title", DEFAULT_SITE_DIAGNOSTIC.works_title),
    works_subtitle: str("works_subtitle", DEFAULT_SITE_DIAGNOSTIC.works_subtitle),
    works_cta_microcopy: str("works_cta_microcopy", DEFAULT_SITE_DIAGNOSTIC.works_cta_microcopy),
    works_empty: str("works_empty", DEFAULT_SITE_DIAGNOSTIC.works_empty),
    closing_title: str("closing_title", DEFAULT_SITE_DIAGNOSTIC.closing_title),
    closing_description: str("closing_description", DEFAULT_SITE_DIAGNOSTIC.closing_description),
    float_hint: str("float_hint", DEFAULT_SITE_DIAGNOSTIC.float_hint),
    wizard_title: str("wizard_title", DEFAULT_SITE_DIAGNOSTIC.wizard_title),
    proof_enabled:
      typeof d["proof_enabled"] === "boolean"
        ? d["proof_enabled"]
        : DEFAULT_SITE_DIAGNOSTIC.proof_enabled,
    proof_metric: str("proof_metric", DEFAULT_SITE_DIAGNOSTIC.proof_metric),
    proof_quote: str("proof_quote", DEFAULT_SITE_DIAGNOSTIC.proof_quote),
    proof_author: str("proof_author", DEFAULT_SITE_DIAGNOSTIC.proof_author),
    thanks_title: thanksTitle,
    thanks_description: thanksDescription,
    whatsapp_phone:
      typeof d["whatsapp_phone"] === "string"
        ? d["whatsapp_phone"]
        : DEFAULT_SITE_DIAGNOSTIC.whatsapp_phone,
    whatsapp_message_template: str(
      "whatsapp_message_template",
      DEFAULT_SITE_DIAGNOSTIC.whatsapp_message_template,
    ),
    funnel_version: Math.max(storedVersion, currentVersion),
    steps,
    ...(typeof d["updated_at"] === "string" ? { updated_at: d["updated_at"] } : {}),
  };
}

export const diagnosticSettingsQuery = () =>
  queryOptions({
    queryKey: ["site-settings", "diagnostic"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "site_settings", "diagnostic"));
        if (!snap.exists()) return { ...DEFAULT_SITE_DIAGNOSTIC };
        return asDiagnosticSettings(snap.data() as Record<string, unknown>);
      }),
  });

export const siteDiagnosticLeadsQuery = () =>
  queryOptions({
    queryKey: ["site-diagnostic-leads"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_diagnostic_leads"), orderBy("created_at", "desc")),
        );
        return docsToRows<SiteDiagnosticLead>(snap.docs);
      }),
  });

export const siteTeamAdminQuery = () =>
  queryOptions({
    queryKey: ["site-team", "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "site_team"), orderBy("sort_order", "asc")),
        );
        return docsToRows<SiteTeamMember>(snap.docs);
      }),
  });
