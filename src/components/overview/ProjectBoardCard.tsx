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
import type { Milestone, Project, Task } from "@/integrations/firebase/types";
import { projectManualProgress, resolveProjectProgress } from "@/lib/data";
import {
  boardStageChrome,
  boardStageLabels,
  boardStages,
  clampPercent,
  daysLeft,
  projectCompletedLabel,
  projectStatusForBoardStage,
  type BoardStage,
  type ProjectBoardLane,
  type SprintProgressMode,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

type Props = {
  project: Project;
  stage: ProjectBoardLane;
  tasks: Task[];
  milestones: Milestone[];
  canEdit: boolean;
};

export function ProjectBoardCard({ project, stage, tasks, milestones, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const mode: SprintProgressMode = project.progress_mode === "manual" ? "manual" : "auto";
  const pct = resolveProjectProgress(project, tasks, milestones);
  const dl = daysLeft(project.deadline);
  const isCompleted = stage === "completed";
  const accent = isCompleted ? "bg-zinc-500" : boardStageChrome[stage].accent;

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={cn(
          "group relative w-full overflow-hidden rounded-lg border border-border bg-card p-2.5 text-start transition-all",
          canEdit &&
            "cursor-pointer hover:border-primary/35 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !canEdit && "cursor-default",
        )}
      >
        <span className={cn("absolute inset-y-0 start-0 w-0.5", accent)} aria-hidden />
        <div className="flex items-start justify-between gap-1.5 ps-1">
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="min-w-0 truncate text-xs font-semibold leading-snug hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {project.name}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            {mode === "manual" ? (
              <Hand className="h-3 w-3 text-muted-foreground" aria-label="يدوي" />
            ) : (
              <RefreshCw className="h-3 w-3 text-muted-foreground" aria-label="تلقائي" />
            )}
            {canEdit ? (
              <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-40 group-hover:opacity-100" />
            ) : null}
          </div>
        </div>

        {!isCompleted && dl !== null ? (
          <p className="mt-1 ps-1 text-[10px] text-muted-foreground">
            {dl < 0 ? `متأخر ${Math.abs(dl)}ي` : `${dl}ي متبقٍ`}
          </p>
        ) : null}

        <div className="mt-1.5 flex items-center gap-2 ps-1">
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className="min-w-[2rem] text-end text-[11px] font-bold tabular-nums text-primary">
            {pct}%
          </span>
        </div>
      </button>

      {canEdit ? (
        <EditProjectBoardDialog
          project={project}
          stage={stage}
          tasks={tasks}
          milestones={milestones}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  );
}

function EditProjectBoardDialog({
  project,
  stage,
  tasks,
  milestones,
  open,
  onOpenChange,
}: {
  project: Project;
  stage: ProjectBoardLane;
  tasks: Task[];
  milestones: Milestone[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [markCompleted, setMarkCompleted] = useState(stage === "completed");
  const [draftStage, setDraftStage] = useState<BoardStage>(
    stage === "completed"
      ? (project.board_stage as BoardStage) || "waiting"
      : stage,
  );
  const [draftMode, setDraftMode] = useState<SprintProgressMode>(
    project.progress_mode === "manual" ? "manual" : "auto",
  );
  const [draftPct, setDraftPct] = useState(projectManualProgress(project));

  useEffect(() => {
    if (!open) return;
    const completed = stage === "completed" || project.status === "completed";
    setMarkCompleted(completed);
    setDraftStage(
      completed
        ? ((project.board_stage as BoardStage) || "waiting")
        : stage === "completed"
          ? "waiting"
          : stage,
    );
    setDraftMode(project.progress_mode === "manual" ? "manual" : "auto");
    setDraftPct(projectManualProgress(project));
  }, [open, stage, project]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const progressFields = {
          progress_mode: draftMode,
          progress_percent: clampPercent(draftPct),
        };
        if (markCompleted) {
          await updateDoc(doc(getDb(), "projects", project.id), {
            status: "completed",
            ...progressFields,
            updated_at: nowIso(),
          });
          return;
        }
        await updateDoc(doc(getDb(), "projects", project.id), {
          board_stage: draftStage,
          status: projectStatusForBoardStage(draftStage),
          ...progressFields,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("تم تحديث المشروع");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const autoPct = resolveProjectProgress(
    { ...project, progress_mode: "auto" },
    tasks,
    milestones,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="border-b border-border bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle className="text-base leading-snug">{project.name}</DialogTitle>
            <DialogDescription className="text-xs">
              عدّل المرحلة ووضع التقدّم
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">المرحلة</Label>
            <div className="grid grid-cols-2 gap-2">
              {boardStages.map((s) => {
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
                    {boardStageLabels[s]}
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
                {projectCompletedLabel}
              </button>
            </div>
          </div>

          <ProgressModeFields
            mode={draftMode}
            onModeChange={setDraftMode}
            percent={draftMode === "manual" ? draftPct : autoPct}
            onPercentChange={setDraftPct}
            disabled={save.isPending}
            autoHint="تُحسب تلقائياً من مهام المشروع ومراحله"
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
