import type { LucideIcon } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  target,
  targetProgress,
  showTargetBar,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
  target?: number | null;
  targetProgress?: number | null;
  showTargetBar?: boolean;
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
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          {showTargetBar && target != null && targetProgress != null ? (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>الهدف</span>
                <span>{targetProgress}%</span>
              </div>
              <Progress value={targetProgress} className="h-1.5" />
            </div>
          ) : null}
        </div>
        <span className={cn("rounded-xl p-2.5", toneClasses)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}
