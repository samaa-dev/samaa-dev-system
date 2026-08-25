import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { clientsQuery, projectsQuery, type Project } from "@/lib/data";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
  formatDate,
  projectStatusLabels,
  statusTone,
  type ProjectStatus,
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
        ]}
      />
    </AppShell>
  );
}

function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState({
    name: "",
    description: "",
    client_id: "",
    status: "planning" as ProjectStatus,
    budget: "",
    deadline: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({
        name: form.name.trim(),
        scope_of_work: form.description.trim() || null,
        client_id: form.client_id || null,
        status: form.status,
        budget: form.budget ? Number(form.budget) : 0,
        deadline: form.deadline || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("تم إنشاء المشروع");
      setOpen(false);
      setForm({ name: "", description: "", client_id: "", status: "planning", budget: "", deadline: "" });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>مشروع جديد</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="p-name">اسم المشروع</Label>
            <Input id="p-name" value={form.name} maxLength={120} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="p-desc">الوصف</Label>
            <Textarea id="p-desc" value={form.description} maxLength={1000} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
              <Label htmlFor="p-budget">الميزانية (د.ج)</Label>
              <Input id="p-budget" type="number" min={0} value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="p-deadline">الموعد النهائي</Label>
              <Input id="p-deadline" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>
        </div>
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
