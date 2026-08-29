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
import { ProjectOverviewBoard } from "@/components/overview/ProjectOverviewBoard";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/hooks/use-auth";
import { usePersistedToggle } from "@/hooks/use-persisted-toggle";
import { milestonesQuery, projectsQuery, sprintsQuery, tasksQuery } from "@/lib/data";

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
            <div className="mb-2">
              <h2 className="text-sm font-semibold">المشاريع</h2>
              <p className="text-[11px] text-muted-foreground">اسحب بين المراحل · انقر للتفاصيل</p>
            </div>
            <ProjectOverviewBoard
              projects={projects}
              tasks={tasks}
              milestones={milestones}
              canEdit={canEditProjects}
              showCompleted={showCompletedProjects}
            />
          </section>

          <section className="panel p-3">
            <CycleOverviewBoard
              sprints={sprints}
              tasks={tasks}
              projectNameById={projectNameById}
              canEdit={canEditSprints}
              showCompleted={showCompletedCycles}
            />
          </section>
        </div>

        <section className="panel min-h-[32rem] p-3 lg:col-span-1 lg:sticky lg:top-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">المهام المفتوحة</h2>
              <p className="text-[11px] text-muted-foreground">اسحب بين الانتظار والعمل</p>
            </div>
            <div className="flex items-center gap-1.5">
              <NewTaskDialog
                trigger={
                  <Button size="sm" variant="outline" className="h-8 px-2">
                    <ListChecks className="h-3.5 w-3.5" />
                    مهمة
                  </Button>
                }
              />
              <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                <Link to="/tasks">الكل</Link>
              </Button>
            </div>
          </div>
          <OverviewTasksBoard
            tasks={visibleTasks}
            projectNameById={projectNameById}
            canEdit={canEditTasks}
            layout="sidebar"
          />
        </section>
      </div>
    </AppShell>
  );
}
