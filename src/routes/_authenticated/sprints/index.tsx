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
import { supabase } from "@/integrations/supabase/client";
import { projectsQuery, sprintsQuery, tasksQuery } from "@/lib/data";
import { formatDate, sprintStatusLabels, statusTone, type SprintStatus } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/sprints/")({
  head: () => ({
    meta: [
      { title: "السبرنتات — Samaa Dev" },
      { name: "description", content: "تخطيط ومتابعة سبرنتات فريق Samaa Dev وأهدافها." },
      { property: "og:title", content: "السبرنتات — Samaa Dev" },
      { property: "og:description", content: "سبرنتات الفريق: الأهداف، المدة ونسبة الإنجاز." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SprintsPage,
});

function SprintsPage() {
  const { data: me } = useCurrentUser();
  const { data: sprints = [] } = useQuery(sprintsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";

  return (
    <AppShell
      title="السبرنتات"
      description={`${sprints.length} سبرنت`}
      actions={me?.isStaff ? <NewSprintDialog /> : undefined}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sprints.length === 0 ? (
          <p className="panel p-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            لا توجد سبرنتات بعد.
          </p>
        ) : (
          sprints.map((s) => {
            const items = tasks.filter((t) => t.sprint_id === s.id);
            const done = items.filter((t) => t.status === "done").length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            return (
              <article key={s.id} className="panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{s.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{projectName(s.project_id)}</p>
                  </div>
                  <StatusBadge tone={statusTone(s.status)}>
                    {sprintStatusLabels[s.status as SprintStatus] ?? s.status}
                  </StatusBadge>
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
    </AppShell>
  );
}

function NewSprintDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const [form, setForm] = useState({
    name: "",
    goal: "",
    project_id: "",
    status: "planned" as SprintStatus,
    start_date: "",
    end_date: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sprints").insert({
        name: form.name.trim(),
        goal: form.goal.trim() || null,
        project_id: form.project_id,
        status: form.status,
        ...(form.start_date ? { start_date: form.start_date } : {}),
        ...(form.end_date ? { end_date: form.end_date } : {}),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      toast.success("تم إنشاء السبرنت");
      setOpen(false);
      setForm({ name: "", goal: "", project_id: "", status: "planned", start_date: "", end_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />سبرنت جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>سبرنت جديد</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s-name">اسم السبرنت</Label>
            <Input id="s-name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s-goal">هدف السبرنت</Label>
            <Textarea id="s-goal" maxLength={500} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
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
            <div className="grid gap-2">
              <Label htmlFor="s-start">تاريخ البداية</Label>
              <Input id="s-start" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s-end">تاريخ النهاية</Label>
              <Input id="s-end" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || !form.project_id || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ السبرنت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
