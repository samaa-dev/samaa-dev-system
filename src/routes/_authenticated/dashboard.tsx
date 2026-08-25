import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/AppShell";
import { KpiSettingsPanel } from "@/components/KpiSettingsPanel";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  clientsQuery,
  kpiSettingsQuery,
  milestonesQuery,
  projectProgress,
  projectsQuery,
  sprintsQuery,
  tasksQuery,
  transactionsQuery,
} from "@/lib/data";
import {
  KPI_CATALOG,
  mergeKpiSettings,
  resolveKpiDisplay,
  targetProgress,
  type KpiContext,
} from "@/lib/kpis";
import {
  daysLeft,
  formatDate,
  projectStatusLabels,
  statusTone,
  taskStatusLabels,
  type ProjectStatus,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة القيادة — Samaa Dev" },
      { name: "description", content: "نظرة شاملة على المشاريع، المهام والأداء المالي لوكالة Samaa Dev." },
      { property: "og:title", content: "لوحة القيادة — Samaa Dev" },
      { property: "og:description", content: "مؤشرات المشاريع والمهام والمالية في لوحة واحدة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: me } = useCurrentUser();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());
  const { data: milestones = [] } = useQuery(milestonesQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: sprints = [] } = useQuery(sprintsQuery());
  const { data: transactions = [] } = useQuery({ ...transactionsQuery(), enabled: Boolean(me?.isStaff) });
  const { data: kpiSettings } = useQuery(kpiSettingsQuery());

  const kpiCtx: KpiContext = { me, projects, tasks, sprints, clients, transactions };
  const widgets = mergeKpiSettings(kpiSettings ?? undefined).filter((w) => {
    if (!w.enabled) return false;
    const catalog = KPI_CATALOG.find((c) => c.id === w.id);
    if (!catalog) return false;
    if (catalog.staffOnly && !me?.isStaff) return false;
    return true;
  });

  const activeProjects = projects.filter((p) => ["active", "in_review"].includes(p.status));
  const myTasks = tasks.filter((t) => t.assignee_id === me?.id && t.status !== "done");
  const lateProjects = projects.filter(
    (p) => p.status !== "completed" && (daysLeft(p.deadline) ?? 99) < 0,
  );

  const statusData = (Object.keys(projectStatusLabels) as ProjectStatus[])
    .map((status) => ({
      name: projectStatusLabels[status],
      value: projects.filter((p) => p.status === status).length,
    }))
    .filter((d) => d.value > 0);

  const budgetData = activeProjects.slice(0, 6).map((p) => ({
    name: p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name,
    الميزانية: Number(p.budget),
    المنفق: transactions
      .filter((t) => t.project_id === p.id && t.kind === "expense")
      .reduce((s, t) => s + Number(t.amount), 0),
  }));

  const pieColors = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

  return (
    <AppShell
      title={`مرحباً ${me?.fullName?.split(" ")[0] ?? ""}`}
      description="نظرة عامة على أداء الوكالة اليوم"
      actions={me?.isStaff ? <KpiSettingsPanel /> : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {widgets.map((w) => {
          const catalog = KPI_CATALOG.find((c) => c.id === w.id)!;
          const { value, display, hint, tone } = resolveKpiDisplay(w, catalog, kpiCtx);
          const progress = targetProgress(value, w.target);
          return (
            <StatCard
              key={w.id}
              label={w.label?.trim() || catalog.defaultLabel}
              value={display}
              hint={hint}
              icon={catalog.icon}
              tone={tone}
              target={w.target}
              targetProgress={progress}
              showTargetBar={w.show_target_bar && progress != null}
            />
          );
        })}
      </div>

      {lateProjects.length > 0 ? (
        <div className="panel mt-6 flex items-start gap-3 border-destructive/40 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">مشاريع تجاوزت الموعد النهائي</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lateProjects.map((p) => p.name).join(" · ")}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">تقدّم المشاريع النشطة</h2>
          <div className="mt-4 space-y-4">
            {activeProjects.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مشاريع نشطة بعد.</p>
            ) : (
              activeProjects.map((p) => {
                const pct = projectProgress(
                  tasks.filter((t) => t.project_id === p.id),
                  milestones.filter((m) => m.project_id === p.id),
                );
                const dl = daysLeft(p.deadline);
                return (
                  <Link
                    key={p.id}
                    to="/projects/$projectId"
                    params={{ projectId: p.id }}
                    className="block rounded-lg border border-border p-4 transition-colors hover:border-primary/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{p.name}</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone={statusTone(p.status)}>
                          {projectStatusLabels[p.status as ProjectStatus] ?? p.status}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {dl === null ? "بدون موعد" : dl < 0 ? `متأخر ${Math.abs(dl)} يوم` : `${dl} يوم متبقٍ`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={pct} className="h-2" />
                      <span className="text-xs font-semibold text-primary">{pct}%</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-sm font-semibold">توزيع حالات المشاريع</h2>
          {statusData.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">لا توجد بيانات.</p>
          ) : (
            <div className="mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={pieColors[i % pieColors.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {me?.isStaff && budgetData.length > 0 ? (
        <div className="panel mt-4 p-5">
          <h2 className="text-sm font-semibold">الميزانية مقابل الإنفاق الفعلي</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="الميزانية" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="المنفق" fill="var(--color-chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">مهامي القادمة</h2>
        <div className="mt-3 divide-y divide-border">
          {myTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-success" />
              لا توجد مهام مفتوحة مسندة إليك.
            </p>
          ) : (
            myTasks.slice(0, 6).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-sm">{t.title}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={statusTone(t.status)}>{taskStatusLabels[t.status as never] ?? t.status}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{formatDate(t.due_date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
