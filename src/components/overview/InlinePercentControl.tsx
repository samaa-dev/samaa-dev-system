import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { clampPercent } from "@/lib/samaa";

type Props = {
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

export function InlinePercentControl({ value, disabled, onChange }: Props) {
  const pct = clampPercent(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-2 flex-1" />
        <span className="w-10 shrink-0 text-end text-xs font-semibold text-primary">{pct}%</span>
      </div>
      {!disabled ? (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(clampPercent(pct - 5));
            }}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-7 w-16 px-2 text-center text-xs"
            value={pct}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange(clampPercent(Number(e.target.value)))}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange(clampPercent(pct + 5));
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
