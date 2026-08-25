import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, Link2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  clientsQuery,
  milestonesQuery,
  projectProgress,
  projectQuery,
  resourcesQuery,
  sprintsQuery,
  tasksQuery,
  transactionsQuery,
} from "@/lib/data";
import {
  daysLeft,
  formatCurrency,
  formatDate,
  projectStatusLabels,
  sprintStatusLabels,
  statusTone,
  taskStatusLabels,
  type ProjectStatus,
  type SprintStatus,
  type TaskStatus,
} from "@/lib/samaa";
import { Wallet, CalendarDays, ListChecks } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المشروع — Samaa Dev" },
      { name: "description", content: "تفاصيل المشروع: المراحل، المهام، السبرنتات والميزانية." },
      { property: "og:title", content: "تفاصيل المشروع — Samaa Dev" },
      { property: "og:description", content: "متابعة تقدّم المشروع ومراحله وميزانيته." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: me } = useCurrentUser();
  const { data: project, isFetched } = useQuery(projectQuery(projectId));
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: milestones = [] } = useQuery(milestonesQuery(projectId));
  const { data: tasks = [] } = useQuery(tasksQuery({ projectId }));
  const { data: sprints = [] } = useQuery(sprintsQuery(projectId));
  const { data: resources = [] } = useQuery(resourcesQuery(projectId));
  const { data: transactions = [] } = useQuery({
    ...transactionsQuery(),
    enabled: Boolean(me?.isStaff),
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase.from("milestones").update({ is_completed: value }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones"] }),
    onError: () => toast.error("تعذّر تحديث المرحلة."),
  });

  if (isFetched && !project) {
    return (
      <AppShell title="المشروع غير موجود">
        <div className="panel p-10 text-center">
          <p className="text-sm text-muted-foreground">لم يتم العثور على هذا المشروع.</p>
          <Button asChild className="mt-4"><Link to="/projects">كل المشاريع</Link></Button>
        </div>
      </AppShell>
    );
  }

  const spent = transactions
    .filter((t) => t.project_id === projectId && t.kind === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const collected = transactions
    .filter((t) => t.project_id === projectId && t.kind === "income" && t.is_paid)
    .reduce((s, t) => s + Number(t.amount), 0);
  const pct = projectProgress(tasks, milestones);
  const dl = daysLeft(project?.deadline);

  return (
    <AppShell
      title={project?.name ?? "المشروع"}
      description={clients.find((c) => c.id === project?.client_id)?.name ?? "بدون عميل"}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/projects"><ArrowRight className="h-4 w-4" />المشاريع</Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="نسبة الإنجاز" value={`${pct}%`} icon={ListChecks} />
        <StatCard
          label="الموعد النهائي"
          value={formatDate(project?.deadline)}
          hint={dl === null ? undefined : dl < 0 ? `متأخر ${Math.abs(dl)} يوم` : `${dl} يوم متبقٍ`}
          icon={CalendarDays}
          tone={dl !== null && dl < 0 ? "destructive" : "info"}
        />
        <StatCard label="الميزانية" value={formatCurrency(Number(project?.budget))} icon={Wallet} tone="success" />
        {me?.isStaff ? (
          <StatCard
            label="المنفق / المحصّل"
            value={formatCurrency(spent)}
            hint={`محصّل ${formatCurrency(collected)}`}
            icon={Wallet}
            tone="warning"
          />
        ) : null}
      </div>

      <div className="panel mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">حالة المشروع</h2>
          <StatusBadge tone={statusTone(project?.status ?? "")}>
            {projectStatusLabels[(project?.status ?? "planning") as ProjectStatus]}
          </StatusBadge>
        </div>
        {project?.scope_of_work ? (
          <p className="mt-3 text-sm text-muted-foreground">{project.scope_of_work}</p>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <Progress value={pct} className="h-2" />
          <span className="text-xs font-semibold text-primary">{pct}%</span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">المراحل الرئيسية</h2>
          <div className="mt-3 divide-y divide-border">
            {milestones.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مراحل محددة.</p>
            ) : (
              milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                  <button
                    type="button"
                    disabled={!me?.isStaff}
                    onClick={() => toggleMilestone.mutate({ id: m.id, value: !m.is_completed })}
                    className="flex items-center gap-2 text-start text-sm disabled:cursor-default"
                  >
                    {m.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={m.is_completed ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                  </button>
                  <span className="text-xs text-muted-foreground">{formatDate(m.due_date)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">سبرنتات المشروع</h2>
          <div className="mt-3 divide-y divide-border">
            {sprints.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سبرنتات.</p>
            ) : (
              sprints.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusTone(s.status)}>
                      {sprintStatusLabels[s.status as SprintStatus] ?? s.status}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.start_date)} — {formatDate(s.end_date)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="text-sm font-semibold">مهام المشروع</h2>
          <div className="mt-3 divide-y divide-border">
            {tasks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مهام.</p>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="text-sm">{t.title}</span>
                  <StatusBadge tone={statusTone(t.status)}>
                    {taskStatusLabels[t.status as TaskStatus] ?? t.status}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">الموارد والملفات</h2>
          <div className="mt-3 divide-y divide-border">
            {resources.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد موارد مرتبطة.</p>
            ) : (
              resources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-2 py-3 text-sm hover:text-primary"
                >
                  <Link2 className="h-4 w-4" />
                  {r.label}
                </a>
              ))
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
