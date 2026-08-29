import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Circle, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { ProgressModeFields } from "@/components/ProgressModeFields";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { ProjectPaymentForm } from "@/components/finance/ProjectPaymentForm";
import { RowActions } from "@/components/RowActions";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { Milestone, Project, Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import {
  clientsQuery,
  milestonesQuery,
  projectQuery,
  resolveProjectProgress,
  resourcesQuery,
  sprintsQuery,
  tasksQuery,
  transactionsQuery,
} from "@/lib/data";
import { derivePaymentStatus, projectFinancialSummary } from "@/lib/finance";
import {
  daysLeft,
  formatCurrency,
  formatDate,
  formUiLabels,
  paymentStatusLabels,
  projectStatusLabels,
  sprintStatusLabels,
  sprintUiLabels,
  statusTone,
  taskStatusLabels,
  type ProjectStatus,
  type SprintProgressMode,
  type SprintStatus,
  type TaskStatus,
} from "@/lib/samaa";
import { CalendarDays, ListChecks, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "تفاصيل المشروع — Samaa Dev" },
      { name: "description", content: "تفاصيل المشروع: المراحل، المهام، الدورات والميزانية." },
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

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [editMilestone, setEditMilestone] = useState<Milestone | null>(null);
  const [deleteMilestoneId, setDeleteMilestoneId] = useState<string | null>(null);
  const [deleteResourceId, setDeleteResourceId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Transaction | null>(null);
  const [paymentDefaults, setPaymentDefaults] = useState<
    { project_id?: string; milestone_id?: string; amount?: number; client_id?: string } | undefined
  >();
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  const toggleMilestone = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "milestones", id), {
          is_completed: value,
          completed_at: value ? nowIso() : null,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["milestones"] }),
    onError: () => toast.error("تعذّر تحديث المرحلة."),
  });

  const removeProject = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "projects", projectId));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("تم حذف المشروع");
      window.location.href = "/projects";
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMilestone = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "milestones", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("تم حذف المرحلة");
      setDeleteMilestoneId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeResource = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "project_resources", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("تم حذف المورد");
      setDeleteResourceId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removePayment = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "transactions", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم حذف الدفعة");
      setDeletePaymentId(null);
    },
    onError: (e: Error) => toast.error(e.message),
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

  const finance = projectFinancialSummary(
    projectId,
    Number(project?.budget ?? 0),
    milestones,
    transactions,
  );
  const spent = finance.expenses;
  const collected = finance.collected;
  const pct = project ? resolveProjectProgress(project, tasks, milestones) : 0;
  const dl = daysLeft(project?.deadline);
  const milestoneTitle = (id: string | null | undefined) =>
    id ? milestones.find((m) => m.id === id)?.title ?? "—" : "—";

  const openNewPayment = (defaults?: { milestone_id?: string; amount?: number }) => {
    setEditPayment(null);
    setPaymentDefaults({
      project_id: projectId,
      client_id: project?.client_id ?? undefined,
      ...defaults,
    });
    setPaymentOpen(true);
  };

  return (
    <AppShell
      title={project?.name ?? "المشروع"}
      description={clients.find((c) => c.id === project?.client_id)?.name ?? "بدون عميل"}
      actions={
        <div className="flex items-center gap-2">
          {me?.isStaff ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditProjectOpen(true)}>
                <Pencil className="h-4 w-4" />تعديل
              </Button>
              {me.isAdmin ? (
                <Button variant="destructive" size="sm" onClick={() => setDeleteProjectOpen(true)}>
                  <Trash2 className="h-4 w-4" />حذف
                </Button>
              ) : null}
            </>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link to="/projects"><ArrowRight className="h-4 w-4" />المشاريع</Link>
          </Button>
        </div>
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

      {me?.isStaff ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="الميزانية" value={formatCurrency(finance.budget)} icon={Wallet} tone="primary" />
          <StatCard label="المحصّل" value={formatCurrency(finance.collected)} icon={Wallet} tone="success" />
          <StatCard label="معلّق" value={formatCurrency(finance.outstanding)} icon={Wallet} tone="warning" />
          <StatCard
            label="المتبقي من الميزانية"
            value={formatCurrency(finance.remaining)}
            icon={Wallet}
            tone={finance.remaining >= 0 ? "info" : "destructive"}
          />
        </div>
      ) : null}

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

      {me?.isStaff ? (
        <section className="panel mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">دفعات المشروع</h2>
            <Button size="sm" variant="outline" onClick={() => openNewPayment()}>
              <Plus className="h-4 w-4" />دفعة
            </Button>
          </div>
          <div className="mt-3 divide-y divide-border">
            {finance.payments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد دفعات مسجّلة.</p>
            ) : (
              finance.payments.map((t) => {
                const status = derivePaymentStatus(t);
                return (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatCurrency(Number(t.amount))}
                        {t.invoice_number ? (
                          <span className="ms-2 text-xs text-muted-foreground">#{t.invoice_number}</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {milestoneTitle(t.milestone_id)} · {formatDate(t.occurred_on)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        tone={status === "paid" ? "success" : status === "overdue" ? "destructive" : "warning"}
                      >
                        {paymentStatusLabels[status]}
                      </StatusBadge>
                      <RowActions
                        onEdit={() => {
                          setEditPayment(t);
                          setPaymentDefaults(undefined);
                          setPaymentOpen(true);
                        }}
                        onDelete={me.isAdmin ? () => setDeletePaymentId(t.id) : undefined}
                        canDelete={me.isAdmin}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">المراحل الرئيسية</h2>
            {me?.isStaff ? <NewMilestoneDialog projectId={projectId} /> : null}
          </div>
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
                    className="flex min-w-0 flex-1 items-center gap-2 text-start text-sm disabled:cursor-default"
                  >
                    {m.is_completed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={m.is_completed ? "text-muted-foreground line-through" : ""}>{m.title}</span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.amount ? (
                      <span className="text-xs text-muted-foreground">{formatCurrency(Number(m.amount))}</span>
                    ) : null}
                    <span className="text-xs text-muted-foreground">{formatDate(m.due_date)}</span>
                    {me?.isStaff ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            openNewPayment({
                              milestone_id: m.id,
                              amount: Number(m.amount) || undefined,
                            })
                          }
                        >
                          دفعة
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMilestone(m)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteMilestoneId(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">{sprintUiLabels.projectSection}</h2>
          <div className="mt-3 divide-y divide-border">
            {sprints.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{sprintUiLabels.empty}</p>
            ) : (
              sprints.map((s) => (
                <Link
                  key={s.id}
                  to="/sprints/$sprintId"
                  params={{ sprintId: s.id }}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={statusTone(s.status)}>
                      {sprintStatusLabels[s.status as SprintStatus] ?? s.status}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(s.start_date)} — {formatDate(s.end_date)}
                    </span>
                  </div>
                </Link>
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">الموارد والملفات</h2>
            {me?.isStaff ? <NewResourceDialog projectId={projectId} /> : null}
          </div>
          <div className="mt-3 divide-y divide-border">
            {resources.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد موارد مرتبطة.</p>
            ) : (
              resources.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-3">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center gap-2 text-sm hover:text-primary"
                  >
                    <Link2 className="h-4 w-4" />
                    {r.label}
                  </a>
                  {me?.isStaff ? (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteResourceId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {project && editProjectOpen ? (
        <EditProjectDialog project={project} open={editProjectOpen} onOpenChange={setEditProjectOpen} />
      ) : null}

      {editMilestone ? (
        <EditMilestoneDialog milestone={editMilestone} open onOpenChange={(o) => !o && setEditMilestone(null)} />
      ) : null}

      <ConfirmDelete
        open={deleteProjectOpen}
        onOpenChange={setDeleteProjectOpen}
        title="حذف المشروع"
        description="سيتم حذف المشروع نهائياً."
        pending={removeProject.isPending}
        onConfirm={() => removeProject.mutate()}
      />

      <ConfirmDelete
        open={Boolean(deleteMilestoneId)}
        onOpenChange={(o) => !o && setDeleteMilestoneId(null)}
        title="حذف المرحلة"
        description="سيتم حذف المرحلة نهائياً."
        pending={removeMilestone.isPending}
        onConfirm={() => deleteMilestoneId && removeMilestone.mutate(deleteMilestoneId)}
      />

      <ConfirmDelete
        open={Boolean(deleteResourceId)}
        onOpenChange={(o) => !o && setDeleteResourceId(null)}
        title="حذف المورد"
        description="سيتم حذف رابط المورد."
        pending={removeResource.isPending}
        onConfirm={() => deleteResourceId && removeResource.mutate(deleteResourceId)}
      />

      <ConfirmDelete
        open={Boolean(deletePaymentId)}
        onOpenChange={(o) => !o && setDeletePaymentId(null)}
        title="حذف الدفعة"
        description="سيتم حذف دفعة المشروع نهائياً."
        pending={removePayment.isPending}
        onConfirm={() => deletePaymentId && removePayment.mutate(deletePaymentId)}
      />

      <ProjectPaymentForm
        open={paymentOpen}
        onOpenChange={(o) => {
          setPaymentOpen(o);
          if (!o) {
            setEditPayment(null);
            setPaymentDefaults(undefined);
          }
        }}
        editTx={editPayment}
        defaults={paymentDefaults}
      />
    </AppShell>
  );
}

function EditProjectDialog({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState({
    name: project.name,
    description: project.scope_of_work ?? "",
    client_id: project.client_id ?? "",
    status: project.status as ProjectStatus,
    budget: String(project.budget ?? ""),
    deadline: project.deadline?.slice(0, 10) ?? "",
    progress_mode: (project.progress_mode === "manual" ? "manual" : "auto") as SprintProgressMode,
    progress_percent: Number(project.progress_percent ?? 0),
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "projects", project.id), {
          name: form.name.trim(),
          scope_of_work: form.description.trim() || null,
          client_id: form.client_id || null,
          status: form.status,
          budget: form.budget ? Number(form.budget) : 0,
          deadline: form.deadline || null,
          progress_mode: form.progress_mode,
          progress_percent: Math.min(100, Math.max(0, Math.round(form.progress_percent))),
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>تعديل المشروع</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>اسم المشروع</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>{formUiLabels.projectDescription}</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>العميل</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ProjectStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(projectStatusLabels) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{projectStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الميزانية (د.ج)</Label>
              <Input type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>الموعد النهائي</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
          <ProgressModeFields
            mode={form.progress_mode}
            onModeChange={(progress_mode) => setForm({ ...form, progress_mode })}
            percent={form.progress_percent}
            onPercentChange={(progress_percent) => setForm({ ...form, progress_percent })}
            autoHint="تُحسب تلقائياً من مهام المشروع ومراحله"
          />
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewMilestoneDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", amount: "", due_date: "" });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "milestones", id), {
          project_id: projectId,
          title: form.title.trim(),
          amount: form.amount ? Number(form.amount) : 0,
          due_date: form.due_date || null,
          is_completed: false,
          completed_at: null,
          created_at: now,
          updated_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("تمت إضافة المرحلة");
      setOpen(false);
      setForm({ title: "", amount: "", due_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" />مرحلة</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>مرحلة جديدة</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>العنوان</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المبلغ (د.ج)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>موعد الاستحقاق</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المرحلة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditMilestoneDialog({
  milestone,
  open,
  onOpenChange,
}: {
  milestone: Milestone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: milestone.title,
    amount: String(milestone.amount ?? ""),
    due_date: milestone.due_date?.slice(0, 10) ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "milestones", milestone.id), {
          title: form.title.trim(),
          amount: form.amount ? Number(form.amount) : 0,
          due_date: form.due_date || null,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      toast.success("تم تحديث المرحلة");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>تعديل المرحلة</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>العنوان</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المبلغ (د.ج)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>موعد الاستحقاق</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewResourceDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ label: "", url: "", kind: "link" });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "project_resources", id), {
          project_id: projectId,
          kind: form.kind,
          label: form.label.trim(),
          url: form.url.trim(),
          created_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast.success("تمت إضافة المورد");
      setOpen(false);
      setForm({ label: "", url: "", kind: "link" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" />رابط</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>رابط جديد</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>التسمية</Label>
            <Input placeholder="Figma، GitHub…" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>الرابط</Label>
            <Input type="url" placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.label.trim() || !form.url.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
