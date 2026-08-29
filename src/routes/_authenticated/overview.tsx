import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, ListChecks, Timer, Users } from "lucide-react";

import {
  NewClientDialog,
  NewProjectDialog,
  NewSprintDialog,
  NewTaskDialog,
} from "@/components/create/QuickCreateDialogs";
import { CycleOverviewBoard } from "@/components/overview/CycleOverviewBoard";
import { OverviewTasksBoard } from "@/components/overview/OverviewTasksBoard";
import { ProjectBoardCard } from "@/components/overview/ProjectBoardCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-auth";
import { usePersistedToggle } from "@/hooks/use-persisted-toggle";
import { milestonesQuery, projectsQuery, sprintsQuery, tasksQuery } from "@/lib/data";
import {
  boardStageChrome,
  boardStageLabels,
  boardStages,
  projectCompletedLabel,
  resolveBoardStage,
  type BoardStage,
  type ProjectBoardLane,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

const LS_SHOW_COMPLETED_PROJECTS = "overview.showCompletedProjects";
const LS_SHOW_COMPLETED_CYCLES = "overview.showCompletedCycles";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "عرض الشركة — Samaa Dev" },
      { name: "description", content: "لوحة تشغيل الشركة: مراحل المشاريع، المهام والدورات." },
      { property: "og:title", content: "عرض الشركة — Samaa Dev" },
      {
        property: "og:description",
        content: "متابعة مراحل المشاريع والتقدّم اليدوي والدورات في شاشة واحدة.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data: me } = useCurrentUser();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());
  const { data: milestones = [] } = useQuery(milestonesQuery());
  const { data: sprints = [] } = useQuery(sprintsQuery());

  const [showCompletedProjects, setShowCompletedProjects] = usePersistedToggle(
    LS_SHOW_COMPLETED_PROJECTS,
  );
  const [showCompletedCycles, setShowCompletedCycles] = usePersistedToggle(
    LS_SHOW_COMPLETED_CYCLES,
  );

  const canEditProjects = Boolean(me?.isStaff);
  const canEditSprints = Boolean(me);
  const canEditTasks = Boolean(me);

  const boardProjects = projects
    .map((p) => ({ project: p, stage: resolveBoardStage(p) }))
    .filter((row) => row.stage !== "completed" || showCompletedProjects);

  const operationalProjects = boardProjects.filter(
    (r): r is { project: (typeof projects)[number]; stage: BoardStage } =>
      r.stage !== "completed",
  );

  const completedProjects = boardProjects.filter(
    (r): r is { project: (typeof projects)[number]; stage: "completed" } =>
      r.stage === "completed",
  );

  const byStage = boardStages.reduce(
    (acc, stage) => {
      acc[stage] = operationalProjects.filter((r) => r.stage === stage);
      return acc;
    },
    {} as Record<BoardStage, typeof operationalProjects>,
  );

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const visibleTasks = tasks
    .filter((t) => (me?.isStaff ? true : t.assignee_id === me?.id))
    .slice(0, 30);

  return (
    <AppShell
      title="عرض الشركة"
      description="مراحل المشاريع، المهام والدورات في نظرة واحدة"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <Switch
                id="show-completed-projects"
                checked={showCompletedProjects}
                onCheckedChange={setShowCompletedProjects}
              />
              <Label htmlFor="show-completed-projects" className="cursor-pointer text-xs">
                إظهار المشاريع المكتملة
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-completed-cycles"
                checked={showCompletedCycles}
                onCheckedChange={setShowCompletedCycles}
              />
              <Label htmlFor="show-completed-cycles" className="cursor-pointer text-xs">
                إظهار الدورات المكتملة
              </Label>
            </div>
          </div>
          {canEditProjects ? (
            <>
              <NewProjectDialog
                trigger={
                  <Button size="sm" variant="default">
                    <FolderKanban className="h-4 w-4" />
                    مشروع
                  </Button>
                }
              />
              <NewClientDialog
                trigger={
                  <Button size="sm" variant="outline">
                    <Users className="h-4 w-4" />
                    عميل
                  </Button>
                }
              />
            </>
          ) : null}
          <NewTaskDialog
            trigger={
              <Button size="sm" variant="outline">
                <ListChecks className="h-4 w-4" />
                مهمة
              </Button>
            }
          />
          <NewSprintDialog
            trigger={
              <Button size="sm" variant="outline">
                <Timer className="h-4 w-4" />
                دورة
              </Button>
            }
          />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
        <div className="space-y-4 lg:col-span-3">
          <section className="panel p-3">
            <h2 className="mb-2 text-sm font-semibold">المشاريع</h2>
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              {boardStages.map((stage) => {
                const rows = byStage[stage];
                const chrome = boardStageChrome[stage];
                return (
                  <section
                    key={stage}
                    className={cn(
                      "flex min-h-[14rem] flex-col overflow-hidden rounded-lg border p-0",
                      chrome.border,
                    )}
                  >
                    <header
                      className={cn(
                        "relative flex shrink-0 items-center justify-between gap-2 px-2 py-2",
                        chrome.header,
                      )}
                    >
                      <span
                        className={cn("absolute inset-y-0 start-0 w-1", chrome.accent)}
                        aria-hidden
                      />
                      <h3 className="ps-1.5 text-[11px] font-bold leading-tight">
                        {boardStageLabels[stage]}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-black tabular-nums",
                          chrome.count,
                        )}
                      >
                        {rows.length}
                      </span>
                    </header>
                    <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
                      {rows.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center py-4">
                          <p className="text-[10px] text-muted-foreground">لا مشاريع</p>
                          {canEditProjects && stage === "waiting" ? (
                            <NewProjectDialog
                              trigger={
                                <Button size="sm" variant="ghost" className="mt-1 h-7 text-[10px]">
                                  <FolderKanban className="h-3 w-3" />
                                  إضافة
                                </Button>
                              }
                            />
                          ) : null}
                        </div>
                      ) : (
                        rows.map(({ project, stage: s }) => (
                          <ProjectBoardCard
                            key={project.id}
                            project={project}
                            stage={s}
                            tasks={tasks}
                            milestones={milestones}
                            canEdit={canEditProjects}
                          />
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {showCompletedProjects && completedProjects.length > 0 ? (
              <div className="mt-3 rounded-lg border border-zinc-400/40 bg-zinc-500/5 p-2">
                <h3 className="mb-2 px-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
                  {projectCompletedLabel} ({completedProjects.length})
                </h3>
                <div className="flex flex-col gap-1.5">
                  {completedProjects.map(({ project, stage }) => (
                    <ProjectBoardCard
                      key={project.id}
                      project={project}
                      stage={stage as ProjectBoardLane}
                      tasks={tasks}
                      milestones={milestones}
                      canEdit={canEditProjects}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">المهام المفتوحة</h2>
                <p className="text-[11px] text-muted-foreground">اسحب بين الانتظار والعمل · انقر للتفاصيل</p>
              </div>
              <div className="flex items-center gap-1.5">
                <NewTaskDialog
                  trigger={
                    <Button size="sm" variant="outline" className="h-8">
                      <ListChecks className="h-3.5 w-3.5" />
                      مهمة
                    </Button>
                  }
                />
                <Button asChild size="sm" variant="ghost" className="h-8">
                  <Link to="/tasks">الكل</Link>
                </Button>
              </div>
            </div>
            <OverviewTasksBoard
              tasks={visibleTasks}
              projectNameById={projectNameById}
              canEdit={canEditTasks}
            />
          </section>
        </div>

        <section className="panel min-h-[32rem] p-3 lg:col-span-1 lg:sticky lg:top-4">
          <CycleOverviewBoard
            sprints={sprints}
            tasks={tasks}
            projectNameById={projectNameById}
            canEdit={canEditSprints}
            showCompleted={showCompletedCycles}
          />
        </section>
      </div>
    </AppShell>
  );
}
