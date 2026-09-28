export type Locale = "ar" | "en" | "fr";

export const LOCALES: Locale[] = ["ar", "en", "fr"];

export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_META: Record<
  Locale,
  { label: string; htmlLang: string; dir: "rtl" | "ltr"; prefix: string }
> = {
  ar: { label: "العربية", htmlLang: "ar", dir: "rtl", prefix: "" },
  en: { label: "English", htmlLang: "en", dir: "ltr", prefix: "/en" },
  fr: { label: "Français", htmlLang: "fr", dir: "ltr", prefix: "/fr" },
};

export function isLocale(value: string): value is Locale {
  return value === "ar" || value === "en" || value === "fr";
}

export function localePrefix(locale: Locale): string {
  return LOCALE_META[locale].prefix;
}
