import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { InlinePercentControl } from "@/components/overview/InlinePercentControl";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Sprint, Task } from "@/integrations/firebase/types";
import { sprintProgress } from "@/lib/data";
import {
  clampPercent,
  sprintProgressModeLabels,
  sprintStatusLabels,
  statusTone,
  type SprintStatus,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

type Props = {
  sprint: Sprint;
  projectName?: string | undefined;
  tasks: Task[];
  canEdit: boolean;
};

export function CycleBoardCard({ sprint, projectName, tasks, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const mode = sprint.progress_mode === "manual" ? "manual" : "auto";
  const pct = sprintProgress(sprint, tasks);

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={cn(
          "group w-full rounded-lg border border-border bg-card p-3 text-start transition-all",
          canEdit && "cursor-pointer hover:border-primary/35 hover:shadow-md",
          !canEdit && "cursor-default",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to="/sprints/$sprintId"
              params={{ sprintId: sprint.id }}
              className="text-sm font-semibold hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {sprint.name}
            </Link>
            {projectName ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{projectName}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge tone={statusTone(sprint.status)}>
              {sprintStatusLabels[(sprint.status as SprintStatus)] ?? sprint.status}
            </StatusBadge>
            {canEdit ? (
              <span className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-60 group-hover:opacity-100">
                <Pencil className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{sprintProgressModeLabels[mode]}</p>
        <div className="mt-3">
          <InlinePercentControl value={pct} disabled />
        </div>
      </button>

      {canEdit ? (
        <EditCycleProgressDialog
          sprint={sprint}
          pct={pct}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

function EditCycleProgressDialog({
  sprint,
  pct,
  open,
  onOpenChange,
}: {
  sprint: Sprint;
  pct: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const mode = sprint.progress_mode === "manual" ? "manual" : "auto";
  const [draftPct, setDraftPct] = useState(clampPercent(pct));

  useEffect(() => {
    if (!open) return;
    setDraftPct(clampPercent(pct));
  }, [open, pct]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "sprints", sprint.id), {
          progress_percent: clampPercent(draftPct),
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("تم تحديث نسبة الدورة");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="border-b border-border bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle className="text-base leading-snug">{sprint.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {mode === "manual"
                ? "عدّل نسبة التقدّم من هنا."
                : "هذه الدورة تلقائية حالياً. غيّر وضعها من صفحة الدورة التفصيلية."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">نسبة التقدّم</Label>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <InlinePercentControl
                value={draftPct}
                disabled={mode !== "manual" || save.isPending}
                onChange={setDraftPct}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
          {mode === "manual" ? (
            <Button
              type="button"
              size="sm"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          ) : (
            <Button asChild type="button" size="sm">
              <Link to="/sprints/$sprintId" params={{ sprintId: sprint.id }}>
                فتح صفحة الدورة
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
