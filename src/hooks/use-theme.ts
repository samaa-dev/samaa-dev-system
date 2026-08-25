import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "samaa-theme";

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/** Inline boot script — put in <head> to avoid flash before React hydrates. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(t!=='light'&&t!=='dark')t='dark';var d=document.documentElement;d.classList.toggle('dark',t==='dark');d.classList.toggle('light',t==='light');d.style.colorScheme=t;}catch(e){}})();`;

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof window === "undefined" ? "dark" : readStoredTheme(),
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function setTheme(next: Theme) {
    setThemeState(next);
  }

  function toggleTheme() {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return { theme, setTheme, toggleTheme, isDark: theme === "dark" };
}
