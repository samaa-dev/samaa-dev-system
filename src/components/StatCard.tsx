import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClasses = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    info: "bg-info/15 text-info",
  }[tone];

  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className={cn("rounded-xl p-2.5", toneClasses)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
