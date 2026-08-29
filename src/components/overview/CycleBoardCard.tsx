import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Hand, Pencil, RefreshCw } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { ProgressModeFields } from "@/components/ProgressModeFields";
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
import { Progress } from "@/components/ui/progress";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Sprint, Task } from "@/integrations/firebase/types";
import { sprintProgress } from "@/lib/data";
import {
  clampPercent,
  cycleBoardStageLabels,
  cycleOperationalStages,
  sprintStatusForBoardStage,
  type CycleBoardStage,
  type SprintProgressMode,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

type Props = {
  sprint: Sprint;
  stage: CycleBoardStage;
  projectName?: string | undefined;
  tasks: Task[];
  canEdit: boolean;
};

export function CycleBoardCard({ sprint, stage, projectName, tasks, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const mode: SprintProgressMode = sprint.progress_mode === "manual" ? "manual" : "auto";
  const pct = sprintProgress(sprint, tasks);

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={cn(
          "group w-full rounded-md border border-border bg-card px-2 py-1.5 text-start transition-all",
          canEdit && "cursor-pointer hover:border-primary/35 hover:shadow-sm",
          !canEdit && "cursor-default",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <Link
            to="/sprints/$sprintId"
            params={{ sprintId: sprint.id }}
            className="min-w-0 truncate text-[11px] font-semibold hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {sprint.name}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {mode === "manual" ? (
              <Hand className="h-3 w-3 text-muted-foreground" aria-label="يدوي" />
            ) : (
              <RefreshCw className="h-3 w-3 text-muted-foreground" aria-label="تلقائي" />
            )}
            <span className="text-[10px] font-bold tabular-nums text-primary">{pct}%</span>
            {canEdit ? (
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-40 group-hover:opacity-100" />
            ) : null}
          </div>
        </div>
        {projectName ? (
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{projectName}</p>
        ) : null}
        <Progress value={pct} className="mt-1 h-1" />
      </button>

      {canEdit ? (
        <EditCycleBoardDialog
          sprint={sprint}
          stage={stage}
          pct={pct}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

function EditCycleBoardDialog({
  sprint,
  stage,
  pct,
  open,
  onOpenChange,
}: {
  sprint: Sprint;
  stage: CycleBoardStage;
  pct: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [markCompleted, setMarkCompleted] = useState(stage === "completed");
  const [draftStage, setDraftStage] = useState<Exclude<CycleBoardStage, "completed">>(
    stage === "completed"
      ? ((sprint.board_stage as Exclude<CycleBoardStage, "completed">) || "waiting")
      : stage,
  );
  const [draftMode, setDraftMode] = useState<SprintProgressMode>(
    sprint.progress_mode === "manual" ? "manual" : "auto",
  );
  const [draftPct, setDraftPct] = useState(clampPercent(pct));

  useEffect(() => {
    if (!open) return;
    const completed = stage === "completed" || sprint.status === "completed";
    setMarkCompleted(completed);
    setDraftStage(
      completed
        ? ((sprint.board_stage as Exclude<CycleBoardStage, "completed">) || "waiting")
        : (stage as Exclude<CycleBoardStage, "completed">),
    );
    setDraftMode(sprint.progress_mode === "manual" ? "manual" : "auto");
    setDraftPct(clampPercent(pct));
  }, [open, stage, sprint, pct]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const progressFields = {
          progress_mode: draftMode,
          progress_percent: clampPercent(draftPct),
        };
        if (markCompleted) {
          await updateDoc(doc(getDb(), "sprints", sprint.id), {
            board_stage: "completed",
            status: "completed",
            ...progressFields,
            updated_at: nowIso(),
          });
          return;
        }
        await updateDoc(doc(getDb(), "sprints", sprint.id), {
          board_stage: draftStage,
          status: sprintStatusForBoardStage(draftStage),
          ...progressFields,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("تم تحديث الدورة");
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
              عدّل المرحلة ووضع التقدّم من هنا
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">المرحلة</Label>
            <div className="grid grid-cols-2 gap-2">
              {cycleOperationalStages.map((s) => {
                const active = !markCompleted && draftStage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setMarkCompleted(false);
                      setDraftStage(s);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-start text-xs font-medium transition-colors",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/30",
                    )}
                  >
                    {cycleBoardStageLabels[s]}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setMarkCompleted(true)}
                className={cn(
                  "col-span-2 rounded-xl border px-3 py-2.5 text-start text-xs font-medium transition-colors",
                  markCompleted
                    ? "border-zinc-500 bg-zinc-500/10 text-zinc-700 shadow-sm dark:text-zinc-200"
                    : "border-border bg-card text-foreground hover:border-zinc-400/50",
                )}
              >
                {cycleBoardStageLabels.completed}
              </button>
            </div>
          </div>

          <ProgressModeFields
            mode={draftMode}
            onModeChange={setDraftMode}
            percent={draftPct}
            onPercentChange={setDraftPct}
            disabled={save.isPending}
            autoHint="تُحسب تلقائياً من مهام الدورة"
          />
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
