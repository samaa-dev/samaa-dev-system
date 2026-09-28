/**
 * Extract LinkedIn vanity slug from common profile URL shapes.
 * e.g. https://www.linkedin.com/in/jane-doe/ → jane-doe
 */
export function extractLinkedInSlug(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Already a bare slug
  if (/^[a-zA-Z0-9][\w-]{1,99}$/.test(raw) && !raw.includes(".") && !raw.includes("/")) {
    return raw;
  }

  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProto);
    if (!url.hostname.includes("linkedin.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const inIdx = parts.findIndex((p) => p.toLowerCase() === "in" || p.toLowerCase() === "company");
    if (inIdx >= 0 && parts[inIdx + 1]) {
      return decodeURIComponent(parts[inIdx + 1]!).replace(/\/+$/, "");
    }
  } catch {
    return null;
  }
  return null;
}

/** Hotlinkable avatar URL via unavatar (LinkedIn user profiles). */
export function linkedInAvatarUrl(profileUrlOrSlug: string): string | null {
  const slug = extractLinkedInSlug(profileUrlOrSlug);
  if (!slug) return null;
  return `https://unavatar.io/linkedin/${encodeURIComponent(slug)}`;
}

export function isLikelyImageUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
