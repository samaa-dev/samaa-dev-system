import { useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/locales";
import {
  asLocalized,
  emptyLocalized,
  type LocalizedString,
} from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

export function LocalizedFieldsTabs({
  value,
  onChange,
  children,
}: {
  value?: Locale;
  onChange?: (locale: Locale) => void;
  children: (locale: Locale) => ReactNode;
}) {
  const [internal, setInternal] = useState<Locale>("ar");
  const locale = value ?? internal;
  const setLocale = onChange ?? setInternal;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold uppercase transition-colors",
              code === locale
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {code} · {LOCALE_META[code].label}
          </button>
        ))}
      </div>
      {children(locale)}
    </div>
  );
}

export function LocalizedTextField({
  label,
  value,
  onChange,
  locale,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: LocalizedString | string | undefined;
  onChange: (next: LocalizedString) => void;
  locale: Locale;
  multiline?: boolean;
  rows?: number;
}) {
  const current = asLocalized(value, emptyLocalized());
  const text = current[locale] ?? "";

  return (
    <div className="space-y-1.5">
      <Label>
        {label}{" "}
        <span className="text-[10px] font-normal uppercase text-muted-foreground">
          ({locale})
        </span>
      </Label>
      {multiline ? (
        <Textarea
          rows={rows}
          value={text}
          onChange={(e) => onChange({ ...current, [locale]: e.target.value })}
        />
      ) : (
        <Input
          value={text}
          onChange={(e) => onChange({ ...current, [locale]: e.target.value })}
        />
      )}
    </div>
  );
}

export function ensureLocalized(value: unknown, fallback = ""): LocalizedString {
  return asLocalized(value, fallback);
}
