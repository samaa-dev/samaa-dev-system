import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
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
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery, sprintsQuery, tasksQuery, teamQuery, type Task } from "@/lib/data";
import {
  boardColumns,
  formatDate,
  priorityLabels,
  taskStatusLabels,
  type Priority,
  type TaskStatus,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/tasks/")({
  head: () => ({
    meta: [
      { title: "لوحة المهام — Samaa Dev" },
      { name: "description", content: "لوحة كانبان لمهام فريق Samaa Dev بحسب حالة التنفيذ." },
      { property: "og:title", content: "لوحة المهام — Samaa Dev" },
      { property: "og:description", content: "تتبع مهام الفريق من التنفيذ حتى التسليم." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TasksPage,
});

const priorityTone = { high: "destructive", medium: "warning", low: "info" } as const;

function TasksPage() {
  const queryClient = useQueryClient();
  const [projectFilter, setProjectFilter] = useState("all");
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: team = [] } = useQuery(teamQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());

  const move = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = tasks.filter((t) => projectFilter === "all" || t.project_id === projectFilter);
  const memberName = (id: string | null) => team.find((m) => m.id === id)?.full_name ?? "غير مسند";

  return (
    <AppShell
      title="لوحة المهام"
      description={`${visible.length} مهمة`}
      actions={<NewTaskDialog />}
    >
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المشاريع</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {boardColumns.map((col) => {
          const items = visible.filter((t) => t.status === col);
          return (
            <section key={col} className="panel flex flex-col p-4">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">{taskStatusLabels[col]}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </header>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">لا مهام</p>
                ) : (
                  items.map((t: Task) => (
                    <article key={t.id} className="rounded-lg border border-border bg-background/40 p-3">
                      <p className="text-sm font-medium leading-snug">{t.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={priorityTone[t.priority as Priority] ?? "muted"}>
                          {priorityLabels[t.priority as Priority] ?? t.priority}
                        </StatusBadge>
                        {t.due_date ? (
                          <span className="text-xs text-muted-foreground">{formatDate(t.due_date)}</span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{memberName(t.assignee_id)}</p>
                      <Select
                        value={t.status}
                        onValueChange={(v) => move.mutate({ id: t.id, status: v as TaskStatus })}
                      >
                        <SelectTrigger className="mt-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>{taskStatusLabels[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function NewTaskDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: sprints = [] } = useQuery(sprintsQuery());
  const { data: team = [] } = useQuery(teamQuery());
  const [form, setForm] = useState({
    title: "",
    description: "",
    project_id: "",
    sprint_id: "",
    assignee_id: "",
    status: "todo" as TaskStatus,
    priority: "medium" as Priority,
    due_date: "",
    estimate_hours: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        project_id: form.project_id,
        sprint_id: form.sprint_id || null,
        assignee_id: form.assignee_id || null,
        status: form.status,
        priority: form.priority,
        due_date: form.due_date || null,
        ...(form.estimate_hours ? { estimated_hours: Number(form.estimate_hours) } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("تمت إضافة المهمة");
      setOpen(false);
      setForm({ ...form, title: "", description: "", due_date: "", estimate_hours: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const projectSprints = sprints.filter((s) => !form.project_id || s.project_id === form.project_id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />مهمة جديدة</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>مهمة جديدة</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="t-title">عنوان المهمة</Label>
            <Input id="t-title" maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="t-desc">التفاصيل</Label>
            <Textarea id="t-desc" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v, sprint_id: "" })}>
                <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>السبرنت</Label>
              <Select value={form.sprint_id} onValueChange={(v) => setForm({ ...form, sprint_id: v })}>
                <SelectTrigger><SelectValue placeholder="بدون سبرنت" /></SelectTrigger>
                <SelectContent>
                  {projectSprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>المسؤول</Label>
              <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر عضو الفريق" /></SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name ?? "عضو"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(taskStatusLabels) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{taskStatusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الأولوية</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-due">تاريخ الاستحقاق</Label>
              <Input id="t-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="t-est">الساعات المقدّرة</Label>
              <Input id="t-est" type="number" min={0} value={form.estimate_hours} onChange={(e) => setForm({ ...form, estimate_hours: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || !form.project_id || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المهمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
