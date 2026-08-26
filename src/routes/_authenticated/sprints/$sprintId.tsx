import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";

import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { RowActions } from "@/components/RowActions";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Sprint } from "@/integrations/firebase/types";
import { projectsQuery, sprintQuery, tasksQuery } from "@/lib/data";
import {
  formatDate,
  priorityLabels,
  sprintProgressModeLabels,
  sprintStatusLabels,
  sprintUiLabels,
  statusTone,
  taskStatusLabels,
  type Priority,
  type SprintStatus,
  type TaskStatus,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/sprints/$sprintId")({
  head: () => ({
    meta: [
      { title: `تفاصيل ${sprintUiLabels.singularDefinite} — Samaa Dev` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SprintDetailPage,
});

function SprintDetailPage() {
  const { sprintId } = Route.useParams();
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: sprint, isFetched } = useQuery(sprintQuery(sprintId));
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery({ sprintId }));
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const remove = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "sprints", sprintId));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("تم حذف الدورة");
      window.history.back();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isFetched && !sprint) {
    return (
      <AppShell title="الدورة غير موجودة">
        <div className="panel p-10 text-center">
          <p className="text-sm text-muted-foreground">لم يتم العثور على هذه الدورة.</p>
          <Button asChild className="mt-4"><Link to="/sprints">{sprintUiLabels.module}</Link></Button>
        </div>
      </AppShell>
    );
  }

  const done = tasks.filter((t) => t.status === "done").length;
  const mode = sprint?.progress_mode === "manual" ? "manual" : "auto";
  const pct = mode === "manual"
    ? Number(sprint?.progress_percent ?? 0)
    : tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const project = projects.find((p) => p.id === sprint?.project_id);

  return (
    <AppShell
      title={sprint?.name ?? sprintUiLabels.singularDefinite}
      description={project?.name ?? "—"}
      actions={
        <div className="flex items-center gap-2">
          {me?.isStaff ? (
            <RowActions onEdit={() => setEditOpen(true)} onDelete={() => setDeleteOpen(true)} />
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link to="/sprints"><ArrowRight className="h-4 w-4" />{sprintUiLabels.module}</Link>
          </Button>
        </div>
      }
    >
      <div className="panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{sprintUiLabels.goal}</h2>
          <StatusBadge tone={statusTone(sprint?.status ?? "")}>
            {sprintStatusLabels[(sprint?.status ?? "planned") as SprintStatus]}
          </StatusBadge>
        </div>
        {sprint?.goal ? (
          <p className="mt-3 text-sm text-muted-foreground">{sprint.goal}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">لا يوجد هدف محدد.</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          {formatDate(sprint?.start_date)} — {formatDate(sprint?.end_date)}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-sm font-semibold text-primary">{pct}%</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {sprintProgressModeLabels[mode]} · {done} من {tasks.length} مهمة مكتملة
        </p>
      </div>

      <section className="panel mt-4 p-5">
        <h2 className="text-sm font-semibold">مهام الدورة</h2>
        <div className="mt-3 divide-y divide-border">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مهام في هذه الدورة.</p>
          ) : (
            tasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="text-sm">{t.title}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={statusTone(t.priority)}>
                    {priorityLabels[t.priority as Priority] ?? t.priority}
                  </StatusBadge>
                  <StatusBadge tone={statusTone(t.status)}>
                    {taskStatusLabels[t.status as TaskStatus] ?? t.status}
                  </StatusBadge>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {sprint && editOpen ? (
        <EditSprintDialog sprint={sprint} open={editOpen} onOpenChange={setEditOpen} />
      ) : null}

      <ConfirmDelete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="حذف الدورة"
        description="سيتم حذف الدورة نهائياً."
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </AppShell>
  );
}

function EditSprintDialog({
  sprint,
  open,
  onOpenChange,
}: {
  sprint: Sprint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const [form, setForm] = useState({
    name: sprint.name,
    goal: sprint.goal ?? "",
    project_id: sprint.project_id,
    status: sprint.status as SprintStatus,
    progress_mode: sprint.progress_mode === "manual" ? "manual" : "auto",
    progress_percent: String(sprint.progress_percent ?? 0),
    start_date: sprint.start_date?.slice(0, 10) ?? "",
    end_date: sprint.end_date?.slice(0, 10) ?? "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "sprints", sprint.id), {
          name: form.name.trim(),
          goal: form.goal.trim() || null,
          project_id: form.project_id,
          status: form.status,
          progress_mode: form.progress_mode,
          progress_percent: Math.min(100, Math.max(0, Number(form.progress_percent || 0))),
          start_date: form.start_date,
          end_date: form.end_date,
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
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>تعديل الدورة</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>{sprintUiLabels.name}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>{sprintUiLabels.goal}</Label>
            <Textarea value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as SprintStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(sprintStatusLabels) as SprintStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{sprintStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
                <div>
                  <Label>احتساب التقدّم</Label>
                  <p className="text-xs text-muted-foreground">تلقائي من المهام أو يدوي من الواجهة</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {sprintProgressModeLabels[form.progress_mode as "auto" | "manual"]}
                  </span>
                  <Switch
                    checked={form.progress_mode === "manual"}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, progress_mode: checked ? "manual" : "auto" })
                    }
                  />
                </div>
              </div>
            </div>
            {form.progress_mode === "manual" ? (
              <div className="grid gap-2">
                <Label>نسبة التقدّم اليدوية</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={form.progress_percent}
                  onChange={(e) => setForm({ ...form, progress_percent: e.target.value })}
                />
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label>تاريخ البداية</Label>
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>تاريخ النهاية</Label>
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
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
