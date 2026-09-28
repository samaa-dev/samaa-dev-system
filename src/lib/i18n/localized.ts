import type { Locale } from "./locales";

export type LocalizedString = {
  ar: string;
  en: string;
  fr: string;
};

export function emptyLocalized(fallback = ""): LocalizedString {
  return { ar: fallback, en: "", fr: "" };
}

export function localized(ar: string, en = "", fr = ""): LocalizedString {
  return { ar, en: en || ar, fr: fr || en || ar };
}

/** Prefer current locale, then Arabic, then any non-empty value. */
export function pick(value: LocalizedString | string | null | undefined, locale: Locale): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const direct = value[locale]?.trim();
  if (direct) return value[locale];
  if (value.ar?.trim()) return value.ar;
  if (value.en?.trim()) return value.en;
  if (value.fr?.trim()) return value.fr;
  return "";
}

export function asLocalized(raw: unknown, fallback: LocalizedString | string = ""): LocalizedString {
  const fb =
    typeof fallback === "string" ? emptyLocalized(fallback) : { ...emptyLocalized(), ...fallback };

  if (typeof raw === "string") {
    return { ar: raw, en: fb.en || raw, fr: fb.fr || fb.en || raw };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const ar = typeof o["ar"] === "string" ? o["ar"] : fb.ar;
    const en = typeof o["en"] === "string" ? o["en"] : fb.en || ar;
    const fr = typeof o["fr"] === "string" ? o["fr"] : fb.fr || en || ar;
    return { ar, en, fr };
  }
  return fb;
}

export function setLocalizedField(
  current: LocalizedString,
  locale: Locale,
  text: string,
): LocalizedString {
  return { ...current, [locale]: text };
}

export function trimLocalized(value: LocalizedString): LocalizedString {
  return {
    ar: value.ar.trim(),
    en: value.en.trim(),
    fr: value.fr.trim(),
  };
}
