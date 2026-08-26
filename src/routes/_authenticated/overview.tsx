import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, ListChecks, Timer, Users } from "lucide-react";

import {
  NewClientDialog,
  NewProjectDialog,
  NewSprintDialog,
  NewTaskDialog,
} from "@/components/create/QuickCreateDialogs";
import { OverviewTasksBoard } from "@/components/overview/OverviewTasksBoard";
import { CycleBoardCard } from "@/components/overview/CycleBoardCard";
import { ProjectBoardCard } from "@/components/overview/ProjectBoardCard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-auth";
import { projectsQuery, sprintsQuery, tasksQuery } from "@/lib/data";
import {
  boardStageChrome,
  boardStageLabels,
  boardStages,
  resolveBoardStage,
  sprintUiLabels,
  type BoardStage,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "عرض الشركة — Samaa Dev" },
      { name: "description", content: "لوحة تشغيل الشركة: مراحل المشاريع، المهام والدورات." },
      { property: "og:title", content: "عرض الشركة — Samaa Dev" },
      { property: "og:description", content: "متابعة مراحل المشاريع والتقدّم اليدوي والدورات في شاشة واحدة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { data: me } = useCurrentUser();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());
  const { data: sprints = [] } = useQuery(sprintsQuery());

  const canEditProjects = Boolean(me?.isStaff);
  const canEditSprints = Boolean(me);
  const canEditTasks = Boolean(me);

  const boardProjects = projects
    .map((p) => {
      const stage = resolveBoardStage(p);
      return stage ? { project: p, stage } : null;
    })
    .filter((row): row is { project: (typeof projects)[number]; stage: BoardStage } => Boolean(row));

  const byStage = boardStages.reduce(
    (acc, stage) => {
      acc[stage] = boardProjects.filter((r) => r.stage === stage);
      return acc;
    },
    {} as Record<BoardStage, typeof boardProjects>,
  );

  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

  const sortedSprints = [...sprints].sort((a, b) => {
    const rank = (s: string) => (s === "active" ? 0 : s === "planned" ? 1 : 2);
    const d = rank(a.status) - rank(b.status);
    if (d !== 0) return d;
    return (b.start_date ?? "").localeCompare(a.start_date ?? "");
  });

  const visibleTasks = tasks
    .filter((t) => (me?.isStaff ? true : t.assignee_id === me?.id))
    .slice(0, 30);

  return (
    <AppShell
      title="عرض الشركة"
      description="مراحل المشاريع، المهام والدورات في نظرة واحدة"
      actions={
        <div className="flex flex-wrap items-center gap-2">
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
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {boardStages.map((stage) => {
            const rows = byStage[stage];
            const chrome = boardStageChrome[stage];
            return (
              <section
                key={stage}
                className={cn(
                  "panel flex min-h-[18rem] flex-col overflow-hidden border p-0",
                  chrome.border,
                )}
              >
                <header
                  className={cn(
                    "relative flex items-center justify-between gap-3 px-3.5 py-3.5",
                    chrome.header,
                  )}
                >
                  <span
                    className={cn("absolute inset-y-0 start-0 w-1.5", chrome.accent)}
                    aria-hidden
                  />
                  <h2 className="ps-2 text-base font-bold tracking-tight leading-tight">
                    {boardStageLabels[stage]}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-2.5 text-lg font-black tabular-nums shadow-sm",
                      chrome.count,
                    )}
                  >
                    {rows.length}
                  </span>
                </header>
                <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                  {rows.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8">
                      <p className="text-xs text-muted-foreground">لا مشاريع</p>
                      {canEditProjects && stage === "waiting" ? (
                        <NewProjectDialog
                          trigger={
                            <Button size="sm" variant="ghost" className="h-8 text-xs">
                              <FolderKanban className="h-3.5 w-3.5" />
                              إضافة مشروع
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
                        canEdit={canEditProjects}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <section className="panel p-4 lg:col-span-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">المهام المفتوحة</h2>
                <p className="text-[11px] text-muted-foreground">
                  انتظار، عمل، ومكتملات اليوم فقط
                </p>
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

          <aside className="panel flex min-h-[12rem] flex-col p-3 lg:col-span-1">
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
            <div className="flex flex-1 flex-col gap-3">
              {sortedSprints.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{sprintUiLabels.empty}</p>
              ) : (
                sortedSprints.map((s) => (
                  <CycleBoardCard
                    key={s.id}
                    sprint={s}
                    projectName={projectNameById.get(s.project_id) ?? ""}
                    tasks={tasks}
                    canEdit={canEditSprints}
                  />
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
