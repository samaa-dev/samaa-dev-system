import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { InlinePercentControl } from "@/components/overview/InlinePercentControl";
import { StatusBadge, type Tone } from "@/components/StatusBadge";
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
import type { Project } from "@/integrations/firebase/types";
import { projectManualProgress } from "@/lib/data";
import {
  boardStageChrome,
  boardStageLabels,
  boardStages,
  clampPercent,
  daysLeft,
  type BoardStage,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

const stageTone: Record<BoardStage, Tone> = {
  waiting: "muted",
  design: "info",
  active_work: "success",
  urgent_delivery: "warning",
};

type Props = {
  project: Project;
  stage: BoardStage;
  canEdit: boolean;
};

export function ProjectBoardCard({ project, stage, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const pct = projectManualProgress(project);
  const dl = daysLeft(project.deadline);

  return (
    <>
      <button
        type="button"
        onClick={() => canEdit && setOpen(true)}
        disabled={!canEdit}
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-card to-card/80 p-3.5 text-start shadow-sm transition-all",
          canEdit &&
            "cursor-pointer hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !canEdit && "cursor-default",
        )}
      >
        <span
          className={cn("absolute inset-y-0 start-0 w-1", boardStageChrome[stage].accent)}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/projects/$projectId"
            params={{ projectId: project.id }}
            className="min-w-0 text-sm font-semibold leading-snug hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {project.name}
          </Link>
          {canEdit ? (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100">
              <Pencil className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={stageTone[stage]} className="px-2 py-0 text-[10px]">
            {boardStageLabels[stage]}
          </StatusBadge>
          <span className="text-[10px] text-muted-foreground">
            {dl === null
              ? "بدون موعد"
              : dl < 0
                ? `متأخر ${Math.abs(dl)}ي`
                : `${dl}ي متبقٍ`}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="min-w-[2.25rem] text-end text-sm font-bold tabular-nums text-primary">
            {pct}%
          </span>
        </div>
      </button>

      {canEdit ? (
        <EditProjectBoardDialog
          project={project}
          stage={stage}
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
  open,
  onOpenChange,
}: {
  project: Project;
  stage: BoardStage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [draftStage, setDraftStage] = useState<BoardStage>(stage);
  const [draftPct, setDraftPct] = useState(projectManualProgress(project));

  useEffect(() => {
    if (!open) return;
    setDraftStage(stage);
    setDraftPct(projectManualProgress(project));
  }, [open, stage, project]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "projects", project.id), {
          board_stage: draftStage,
          progress_percent: clampPercent(draftPct),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="border-b border-border bg-muted/40 px-5 py-4">
          <DialogHeader className="gap-1 text-start">
            <DialogTitle className="text-base leading-snug">{project.name}</DialogTitle>
            <DialogDescription className="text-xs">
              عدّل المرحلة ونسبة التقدّم يدوياً
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">المرحلة</Label>
            <div className="grid grid-cols-2 gap-2">
              {boardStages.map((s) => {
                const active = draftStage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraftStage(s)}
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
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">نسبة التقدّم</Label>
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <InlinePercentControl value={draftPct} onChange={setDraftPct} />
            </div>
          </div>
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
