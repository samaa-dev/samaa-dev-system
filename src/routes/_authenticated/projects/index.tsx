import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { ProgressModeFields } from "@/components/ProgressModeFields";
import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { clientsQuery, projectsQuery, type Project } from "@/lib/data";
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import {
  formatCurrency,
  formatDate,
  projectStatusLabels,
  statusTone,
  type ProjectStatus,
  type SprintProgressMode,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "المشاريع — Samaa Dev" },
      { name: "description", content: "إدارة مشاريع وكالة Samaa Dev: الحالة، الميزانية والمواعيد." },
      { property: "og:title", content: "المشاريع — Samaa Dev" },
      { property: "og:description", content: "قائمة مشاريع الوكالة وحالاتها وميزانياتها." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: me } = useCurrentUser();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const navigate = useNavigate();
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "projects", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("تم حذف المشروع");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <AppShell
      title="المشاريع"
      description={`${projects.length} مشروع في النظام`}
      actions={me?.isStaff ? <NewProjectDialog /> : undefined}
    >
      <DataTable
        rows={projects}
        searchPlaceholder="ابحث عن مشروع…"
        emptyState="لا توجد مشاريع بعد."
        onRowClick={(p) => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}
        columns={[
          {
            key: "name",
            header: "المشروع",
            value: (p: Project) => p.name,
            cell: (p: Project) => <span className="font-medium">{p.name}</span>,
          },
          {
            key: "client",
            header: "العميل",
            value: (p: Project) => clientName(p.client_id),
            cell: (p: Project) => clientName(p.client_id),
          },
          {
            key: "status",
            header: "الحالة",
            value: (p: Project) => projectStatusLabels[p.status as ProjectStatus] ?? p.status,
            cell: (p: Project) => (
              <StatusBadge tone={statusTone(p.status)}>
                {projectStatusLabels[p.status as ProjectStatus] ?? p.status}
              </StatusBadge>
            ),
          },
          {
            key: "budget",
            header: "الميزانية",
            value: (p: Project) => Number(p.budget),
            cell: (p: Project) => formatCurrency(Number(p.budget)),
          },
          {
            key: "deadline",
            header: "الموعد النهائي",
            value: (p: Project) => p.deadline ?? "",
            cell: (p: Project) => formatDate(p.deadline),
          },
          ...(me?.isStaff
            ? [{
                key: "actions",
                header: "",
                cell: (p: Project) => (
                  <div onClick={(e) => e.stopPropagation()} role="presentation">
                    <RowActions
                      onEdit={() => setEditProject(p)}
                      onDelete={me.isAdmin ? () => setDeleteId(p.id) : undefined}
                      canDelete={me.isAdmin}
                    />
                  </div>
                ),
              }]
            : []),
        ]}
      />

      {editProject ? (
        <EditProjectDialog project={editProject} open onOpenChange={(o) => !o && setEditProject(null)} />
      ) : null}

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف المشروع"
        description="سيتم حذف المشروع نهائياً. هذا الإجراء للمدير فقط."
        pending={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </AppShell>
  );
}

type ProjectForm = {
  name: string;
  client_id: string;
  budget: string;
  deadline: string;
  progress_mode: SprintProgressMode;
  progress_percent: number;
};

function ProjectFormFields({
  form,
  setForm,
  clients,
  showProgress = true,
}: {
  form: ProjectForm;
  setForm: (f: ProjectForm) => void;
  clients: { id: string; name: string }[];
  showProgress?: boolean;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="p-name">اسم المشروع</Label>
        <Input id="p-name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label>العميل</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
          <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="p-budget">الميزانية (د.ج)</Label>
          <Input id="p-budget" type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="p-deadline">الموعد النهائي</Label>
          <Input id="p-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
      </div>
      {showProgress ? (
        <ProgressModeFields
          mode={form.progress_mode}
          onModeChange={(progress_mode) => setForm({ ...form, progress_mode })}
          percent={form.progress_percent}
          onPercentChange={(progress_percent) => setForm({ ...form, progress_percent })}
          autoHint="تُحسب تلقائياً من مهام المشروع ومراحله"
        />
      ) : null}
    </div>
  );
}

function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState<ProjectForm>({
    name: "",
    client_id: "",
    budget: "",
    deadline: "",
    progress_mode: "manual",
    progress_percent: 0,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "projects", id), {
          name: form.name.trim(),
          scope_of_work: null,
          client_id: form.client_id || null,
          status: "planning",
          priority: "medium",
          board_stage: "waiting",
          progress_mode: form.progress_mode,
          progress_percent: form.progress_percent,
          budget: form.budget ? Number(form.budget) : 0,
          start_date: null,
          deadline: form.deadline || null,
          created_by: getFirebaseAuth().currentUser?.uid ?? null,
          created_at: now,
          updated_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("تم إنشاء المشروع");
      setOpen(false);
      setForm({ name: "", client_id: "", budget: "", deadline: "", progress_mode: "manual", progress_percent: 0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          مشروع جديد
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>مشروع جديد</DialogTitle>
        </DialogHeader>
        <ProjectFormFields form={form} setForm={setForm} clients={clients} />
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المشروع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [form, setForm] = useState<ProjectForm>({
    name: project.name,
    client_id: project.client_id ?? "",
    budget: String(project.budget ?? ""),
    deadline: project.deadline?.slice(0, 10) ?? "",
    progress_mode: project.progress_mode === "manual" ? "manual" : "auto",
    progress_percent: Number(project.progress_percent ?? 0),
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "projects", project.id), {
          name: form.name.trim(),
          client_id: form.client_id || null,
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
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>تعديل المشروع</DialogTitle></DialogHeader>
        <ProjectFormFields form={form} setForm={setForm} clients={clients} />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
