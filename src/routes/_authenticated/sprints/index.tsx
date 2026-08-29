import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { ProgressModeFields } from "@/components/ProgressModeFields";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { RowActions } from "@/components/RowActions";
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
import type { Sprint } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { projectsQuery, sprintsQuery, sprintProgress, tasksQuery } from "@/lib/data";
import { formatDate, sprintStatusLabels, sprintUiLabels, statusTone, cycleBoardStageForSprintStatus, type SprintProgressMode, type SprintStatus } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/sprints/")({
  head: () => ({
    meta: [
      { title: `${sprintUiLabels.module} — Samaa Dev` },
      { name: "description", content: `تخطيط ومتابعة ${sprintUiLabels.module} فريق Samaa Dev وأهدافها.` },
      { property: "og:title", content: `${sprintUiLabels.module} — Samaa Dev` },
      { property: "og:description", content: `${sprintUiLabels.module}: الأهداف، المدة ونسبة الإنجاز.` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SprintsPage,
});

function SprintsPage() {
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: sprints = [] } = useQuery(sprintsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "sprints", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("تم حذف الدورة");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <AppShell
      title={sprintUiLabels.module}
      description={sprintUiLabels.count(sprints.length)}
      actions={me?.isStaff ? <NewSprintDialog /> : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sprints.length === 0 ? (
          <p className="panel p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            {sprintUiLabels.empty}
          </p>
        ) : (
          sprints.map((s) => {
            const pct = sprintProgress(s, tasks);
            const items = tasks.filter((t) => t.sprint_id === s.id);
            const done = items.filter((t) => t.status === "done").length;
            return (
              <article key={s.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link to="/sprints/$sprintId" params={{ sprintId: s.id }} className="min-w-0 hover:text-primary">
                    <h2 className="font-semibold">{s.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{projectName(s.project_id)}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <StatusBadge tone={statusTone(s.status)}>
                      {sprintStatusLabels[s.status as SprintStatus] ?? s.status}
                    </StatusBadge>
                    {me?.isStaff ? (
                      <RowActions
                        onEdit={() => setEditSprint(s)}
                        onDelete={() => setDeleteId(s.id)}
                      />
                    ) : null}
                  </div>
                </div>
                {s.goal ? <p className="mt-3 text-sm text-muted-foreground">{s.goal}</p> : null}
                <p className="mt-3 text-xs text-muted-foreground">
                  {formatDate(s.start_date)} — {formatDate(s.end_date)}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={pct} className="h-2" />
                  <span className="text-xs font-semibold text-primary">{pct}%</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {done} من {items.length} مهمة مكتملة
                </p>
              </article>
            );
          })
        )}
      </div>

      {editSprint ? (
        <EditSprintDialog sprint={editSprint} open onOpenChange={(o) => !o && setEditSprint(null)} />
      ) : null}

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف الدورة"
        description="سيتم حذف الدورة نهائياً. المهام المرتبطة ستبقى بدون دورة."
        pending={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </AppShell>
  );
}

type SprintForm = {
  name: string;
  goal: string;
  project_id: string;
  status: SprintStatus;
  start_date: string;
  end_date: string;
  progress_mode: SprintProgressMode;
  progress_percent: number;
};

function SprintFormFields({
  form,
  setForm,
  projects,
  mode,
  showProgress = true,
}: {
  form: SprintForm;
  setForm: (f: SprintForm) => void;
  projects: { id: string; name: string }[];
  mode: "create" | "edit";
  showProgress?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="s-name">{sprintUiLabels.name}</Label>
        <Input id="s-name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>المشروع</Label>
        <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
          <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="s-start">تاريخ البداية</Label>
          <Input id="s-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="s-end">تاريخ النهاية</Label>
          <Input id="s-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
      </div>
      {mode === "edit" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="s-goal">{sprintUiLabels.goal}</Label>
            <Textarea id="s-goal" maxLength={500} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
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
        </>
      ) : null}
      {showProgress ? (
        <ProgressModeFields
          mode={form.progress_mode}
          onModeChange={(progress_mode) => setForm({ ...form, progress_mode })}
          percent={form.progress_percent}
          onPercentChange={(progress_percent) => setForm({ ...form, progress_percent })}
          autoHint="تُحسب تلقائياً من مهام الدورة"
        />
      ) : null}
    </div>
  );
}

function NewSprintDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const [form, setForm] = useState<SprintForm>({
    name: "",
    goal: "",
    project_id: "",
    status: "planned",
    start_date: "",
    end_date: "",
    progress_mode: "manual",
    progress_percent: 0,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "sprints", id), {
          name: form.name.trim(),
          goal: null,
          project_id: form.project_id,
          status: "planned",
          board_stage: "waiting",
          progress_mode: form.progress_mode,
          progress_percent: form.progress_percent,
          start_date: form.start_date || now.slice(0, 10),
          end_date: form.end_date || now.slice(0, 10),
          created_at: now,
          updated_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success(sprintUiLabels.created);
      setOpen(false);
      setForm({ name: "", goal: "", project_id: "", status: "planned", start_date: "", end_date: "", progress_mode: "manual", progress_percent: 0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />{sprintUiLabels.new}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{sprintUiLabels.new}</DialogTitle></DialogHeader>
        <SprintFormFields form={form} setForm={setForm} projects={projects} mode="create" />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || !form.project_id || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : sprintUiLabels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [form, setForm] = useState<SprintForm>({
    name: sprint.name,
    goal: sprint.goal ?? "",
    project_id: sprint.project_id,
    status: sprint.status as SprintStatus,
    start_date: sprint.start_date?.slice(0, 10) ?? "",
    end_date: sprint.end_date?.slice(0, 10) ?? "",
    progress_mode: sprint.progress_mode === "manual" ? "manual" : "auto",
    progress_percent: Number(sprint.progress_percent ?? 0),
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "sprints", sprint.id), {
          name: form.name.trim(),
          goal: form.goal.trim() || null,
          project_id: form.project_id,
          status: form.status,
          board_stage: cycleBoardStageForSprintStatus(form.status),
          start_date: form.start_date,
          end_date: form.end_date,
          progress_mode: form.progress_mode,
          progress_percent: Math.min(100, Math.max(0, Math.round(form.progress_percent))),
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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>تعديل الدورة</DialogTitle></DialogHeader>
        <SprintFormFields form={form} setForm={setForm} projects={projects} mode="edit" />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || !form.project_id || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
