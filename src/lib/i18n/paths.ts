import { DEFAULT_LOCALE, isLocale, localePrefix, type Locale } from "./locales";

export function sectionPath(locale: Locale, slug: string): string {
  const clean = slug.replace(/^\/+/, "").replace(/#/g, "");
  const prefix = localePrefix(locale);
  return `${prefix}/${clean || "home"}`;
}

export function parseWorkspaceLocation(pathname: string): {
  locale: Locale;
  sectionSlug: string;
} {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) {
    return { locale: DEFAULT_LOCALE, sectionSlug: "home" };
  }
  if (isLocale(parts[0]!) && parts[0] !== "ar") {
    return {
      locale: parts[0] as Locale,
      sectionSlug: parts[1] || "home",
    };
  }
  return {
    locale: DEFAULT_LOCALE,
    sectionSlug: parts[0] || "home",
  };
}

export function switchLocalePath(pathname: string, next: Locale): string {
  const { sectionSlug } = parseWorkspaceLocation(pathname);
  return sectionPath(next, sectionSlug);
}

export function hreflangLinks(sectionSlug: string): { locale: Locale; href: string }[] {
  return (["ar", "en", "fr"] as Locale[]).map((locale) => ({
    locale,
    href: sectionPath(locale, sectionSlug),
  }));
}
