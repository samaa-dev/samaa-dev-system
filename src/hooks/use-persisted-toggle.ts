import { useEffect, useState } from "react";

export function usePersistedToggle(key: string, defaultValue = false) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) setValue(stored === "true");
    } catch {
      /* ignore */
    }
  }, [key]);

  const set = (next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, String(next));
    } catch {
      /* ignore */
    }
  };

  return [value, set] as const;
}
