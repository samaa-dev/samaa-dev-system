import type { SiteDiagnosticLead, SiteDiagnosticLeadUtm } from "@/integrations/firebase/types";
import type { Tone } from "@/components/StatusBadge";

const UTM_TONES: Tone[] = ["primary", "info", "success", "warning", "destructive"];

export function leadUtm(l: SiteDiagnosticLead): SiteDiagnosticLeadUtm | undefined {
  const u = l.utm;
  if (!u || typeof u !== "object") return undefined;
  if (!u.source && !u.medium && !u.campaign && !u.term && !u.content) return undefined;
  return u;
}

export function utmCampaignKey(l: SiteDiagnosticLead): string {
  const u = leadUtm(l);
  if (!u) return "";
  return u.campaign?.trim() || u.source?.trim() || "";
}

export function utmDisplayLabel(utm: SiteDiagnosticLeadUtm): string {
  if (utm.campaign?.trim()) return utm.campaign.trim();
  if (utm.source?.trim()) return utm.source.trim();
  return "حملة";
}

/** Stable color per campaign/source string so the same ad always looks the same. */
export function utmToneFor(key: string): Tone {
  const s = key.trim().toLowerCase();
  if (!s) return "muted";
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return UTM_TONES[hash % UTM_TONES.length] ?? "primary";
}

export function uniqueUtmCampaigns(leads: SiteDiagnosticLead[]): string[] {
  const set = new Set<string>();
  for (const l of leads) {
    const c = utmCampaignKey(l);
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "ar"));
}
