import type {
  SiteCategory,
  SiteImpactMetric,
  SiteProject,
  SiteTestimonial,
} from "@/integrations/firebase/types";
import { asLocalized, type LocalizedString } from "@/lib/i18n/localized";

export function localizeProjectRow(row: Record<string, unknown>): SiteProject {
  const metricsRaw = Array.isArray(row["impact_metrics"]) ? row["impact_metrics"] : [];
  return {
    id: String(row["id"] ?? ""),
    title: asLocalized(row["title"]),
    slug: typeof row["slug"] === "string" ? row["slug"] : "",
    category: typeof row["category"] === "string" ? row["category"] : "",
    short_description: asLocalized(row["short_description"]),
    detailed_description: asLocalized(row["detailed_description"]),
    client_name: asLocalized(row["client_name"]),
    challenge: asLocalized(row["challenge"]),
    solution: asLocalized(row["solution"]),
    results: asLocalized(row["results"]),
    timeline: asLocalized(row["timeline"]),
    tech_stack: Array.isArray(row["tech_stack"])
      ? (row["tech_stack"] as unknown[]).filter((t): t is string => typeof t === "string")
      : [],
    cover_image_url: typeof row["cover_image_url"] === "string" ? row["cover_image_url"] : null,
    cover_video_url: typeof row["cover_video_url"] === "string" ? row["cover_video_url"] : null,
    cover_prefer_video: Boolean(row["cover_prefer_video"]),
    gallery_urls: Array.isArray(row["gallery_urls"])
      ? (row["gallery_urls"] as unknown[]).filter((u): u is string => typeof u === "string")
      : [],
    impact_metrics: (metricsRaw as unknown[])
      .filter((m): m is Record<string, unknown> => Boolean(m) && typeof m === "object")
      .map(
        (m): SiteImpactMetric => ({
          label: asLocalized(m["label"]),
          value: typeof m["value"] === "string" ? m["value"] : "",
        }),
      ),
    live_url: typeof row["live_url"] === "string" ? row["live_url"] : null,
    playstore_url: typeof row["playstore_url"] === "string" ? row["playstore_url"] : null,
    appstore_url: typeof row["appstore_url"] === "string" ? row["appstore_url"] : null,
    is_featured: Boolean(row["is_featured"]),
    status: row["status"] === "draft" ? "draft" : "published",
    sort_order: typeof row["sort_order"] === "number" ? row["sort_order"] : 0,
    created_at: typeof row["created_at"] === "string" ? row["created_at"] : "",
    updated_at: typeof row["updated_at"] === "string" ? row["updated_at"] : "",
  };
}

export function localizeCategoryRow(row: Record<string, unknown>): SiteCategory {
  return {
    id: String(row["id"] ?? ""),
    slug: typeof row["slug"] === "string" ? row["slug"] : "",
    label: asLocalized(row["label"]),
    sort_order: typeof row["sort_order"] === "number" ? row["sort_order"] : 0,
    created_at: typeof row["created_at"] === "string" ? row["created_at"] : "",
  };
}

export function localizeTestimonialRow(row: Record<string, unknown>): SiteTestimonial {
  return {
    id: String(row["id"] ?? ""),
    client_name: asLocalized(row["client_name"]),
    client_role: asLocalized(row["client_role"]),
    company_name: asLocalized(row["company_name"]),
    avatar_url: typeof row["avatar_url"] === "string" ? row["avatar_url"] : null,
    quote_text: asLocalized(row["quote_text"]),
    rating: typeof row["rating"] === "number" ? row["rating"] : 5,
    is_visible: Boolean(row["is_visible"]),
    sort_order: typeof row["sort_order"] === "number" ? row["sort_order"] : 0,
    created_at: typeof row["created_at"] === "string" ? row["created_at"] : "",
  };
}

export function textOf(value: LocalizedString | string | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return value.ar?.trim() || value.en?.trim() || value.fr?.trim() || "";
}
