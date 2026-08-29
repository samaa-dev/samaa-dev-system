import { InlinePercentControl } from "@/components/overview/InlinePercentControl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { sprintProgressModeLabels, type SprintProgressMode } from "@/lib/samaa";

type Props = {
  mode: SprintProgressMode;
  onModeChange: (mode: SprintProgressMode) => void;
  percent?: number;
  onPercentChange?: (value: number) => void;
  showPercent?: boolean;
  disabled?: boolean;
  autoHint?: string;
};

export function ProgressModeFields({
  mode,
  onModeChange,
  percent = 0,
  onPercentChange,
  showPercent = true,
  disabled = false,
  autoHint = "تُحسب تلقائياً من بيانات المشروع",
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5">
        <div>
          <p className="text-xs font-medium">وضع التقدّم</p>
          <p className="text-[10px] text-muted-foreground">{sprintProgressModeLabels[mode]}</p>
        </div>
        <Switch
          checked={mode === "manual"}
          disabled={disabled}
          onCheckedChange={(checked) => onModeChange(checked ? "manual" : "auto")}
        />
      </div>

      {showPercent ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">نسبة التقدّم</Label>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <InlinePercentControl
              value={percent}
              disabled={disabled || mode !== "manual" || !onPercentChange}
              onChange={onPercentChange ?? (() => undefined)}
            />
          </div>
          {mode === "auto" ? (
            <p className="text-[10px] text-muted-foreground">{autoHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
