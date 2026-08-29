import { Link } from "@tanstack/react-router";
import { Timer } from "lucide-react";

import { NewSprintDialog } from "@/components/create/QuickCreateDialogs";
import { CycleBoardCard } from "@/components/overview/CycleBoardCard";
import { Button } from "@/components/ui/button";
import type { Sprint, Task } from "@/integrations/firebase/types";
import {
  cycleBoardStageChrome,
  cycleBoardStageLabels,
  cycleOperationalStages,
  resolveCycleBoardStage,
  sprintUiLabels,
  type CycleBoardStage,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

type Props = {
  sprints: Sprint[];
  tasks: Task[];
  projectNameById: Map<string, string>;
  canEdit: boolean;
  showCompleted: boolean;
};

export function CycleOverviewBoard({
  sprints,
  tasks,
  projectNameById,
  canEdit,
  showCompleted,
}: Props) {
  const allBoardSprints = sprints.map((s) => ({
    sprint: s,
    stage: resolveCycleBoardStage(s),
  }));

  const operationalSprints = allBoardSprints.filter(
    (r): r is { sprint: Sprint; stage: Exclude<CycleBoardStage, "completed"> } =>
      r.stage !== "completed",
  );

  const completedSprints = allBoardSprints.filter(
    (r): r is { sprint: Sprint; stage: "completed" } => r.stage === "completed",
  );

  const byStage = cycleOperationalStages.reduce(
    (acc, stage) => {
      acc[stage] = operationalSprints.filter((r) => r.stage === stage);
      return acc;
    },
    {} as Record<Exclude<CycleBoardStage, "completed">, typeof operationalSprints>,
  );

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{sprintUiLabels.module}</h2>
        <div className="flex items-center gap-1.5">
          <NewSprintDialog
            trigger={
              <Button size="sm" variant="outline" className="h-8 px-2">
                <Timer className="h-3.5 w-3.5" />
                جديدة
              </Button>
            }
          />
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link to="/sprints">الكل</Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2">
        {cycleOperationalStages.map((stage) => {
          const rows = byStage[stage];
          const chrome = cycleBoardStageChrome[stage];
          return (
            <section
              key={stage}
              className={cn(
                "flex min-h-[10rem] flex-col overflow-hidden rounded-lg border p-0",
                chrome.border,
              )}
            >
              <header
                className={cn(
                  "relative flex shrink-0 items-center justify-between gap-2 px-2.5 py-2",
                  chrome.header,
                )}
              >
                <span
                  className={cn("absolute inset-y-0 start-0 w-1", chrome.accent)}
                  aria-hidden
                />
                <h3 className="ps-1.5 text-xs font-bold leading-tight">
                  {cycleBoardStageLabels[stage]}
                </h3>
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-black tabular-nums",
                    chrome.count,
                  )}
                >
                  {rows.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
                {rows.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center py-6">
                    <p className="text-[10px] text-muted-foreground">لا دورات</p>
                    {canEdit && stage === "waiting" ? (
                      <NewSprintDialog
                        trigger={
                          <Button size="sm" variant="ghost" className="mt-1 h-7 text-[10px]">
                            <Timer className="h-3 w-3" />
                            إضافة
                          </Button>
                        }
                      />
                    ) : null}
                  </div>
                ) : (
                  rows.map(({ sprint, stage: s }) => (
                    <CycleBoardCard
                      key={sprint.id}
                      sprint={sprint}
                      stage={s}
                      projectName={projectNameById.get(sprint.project_id) ?? ""}
                      tasks={tasks}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {showCompleted && completedSprints.length > 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-400/40 bg-zinc-500/5 p-2">
          <h3 className="mb-2 px-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
            {cycleBoardStageLabels.completed} ({completedSprints.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {completedSprints.map(({ sprint, stage }) => (
              <CycleBoardCard
                key={sprint.id}
                sprint={sprint}
                stage={stage}
                projectName={projectNameById.get(sprint.project_id) ?? ""}
                tasks={tasks}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
