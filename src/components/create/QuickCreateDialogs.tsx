import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { ProgressModeFields } from "@/components/ProgressModeFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { clientsQuery, projectsQuery, teamQuery } from "@/lib/data";
import { priorityLabels, sprintUiLabels, type Priority, type SprintProgressMode } from "@/lib/samaa";

type TriggerProps = {
  trigger?: ReactNode;
};

async function createClientDoc(input: { name: string; phone: string; email: string }) {
  const id = newId();
  const now = nowIso();
  await setDoc(doc(getDb(), "clients", id), {
    name: input.name.trim(),
    company: null,
    created_by: getFirebaseAuth().currentUser?.uid ?? null,
    created_at: now,
    updated_at: now,
  });
  await setDoc(doc(getDb(), "client_contacts", id), {
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    notes: null,
    satisfaction: null,
    created_at: now,
    updated_at: now,
  });
  return id;
}

export function NewClientDialog({
  trigger,
  onCreated,
}: TriggerProps & { onCreated?: (clientId: string) => void }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => createClientDoc(form)),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      toast.success("تمت إضافة العميل");
      onCreated?.(id);
      setOpen(false);
      setForm({ name: "", phone: "", email: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            عميل جديد
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>عميل جديد</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qc-c-name">اسم العميل</Label>
            <Input
              id="qc-c-name"
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="qc-c-phone">الهاتف</Label>
              <Input
                id="qc-c-phone"
                maxLength={40}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qc-c-email">البريد</Label>
              <Input
                id="qc-c-email"
                type="email"
                maxLength={255}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ العميل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewProjectDialog({ trigger }: TriggerProps) {
  const [open, setOpen] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState({
    name: "",
    client_id: "",
    budget: "",
    deadline: "",
    progress_mode: "manual" as SprintProgressMode,
    progress_percent: 0,
  });
  const [clientDraft, setClientDraft] = useState({ name: "", phone: "", email: "" });

  const createClient = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => createClientDoc(clientDraft)),
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      setForm((f) => ({ ...f, client_id: id }));
      setClientDraft({ name: "", phone: "", email: "" });
      setShowNewClient(false);
      toast.success("تمت إضافة العميل واختياره");
    },
    onError: (e: Error) => toast.error(e.message),
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
      setShowNewClient(false);
      setForm({ name: "", client_id: "", budget: "", deadline: "", progress_mode: "manual", progress_percent: 0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setShowNewClient(false);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            مشروع جديد
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>مشروع جديد</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qc-p-name">اسم المشروع</Label>
            <Input
              id="qc-p-name"
              value={form.name}
              maxLength={120}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label>العميل</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setShowNewClient((v) => !v)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {showNewClient ? "إخفاء" : "عميل جديد"}
              </Button>
            </div>
            {showNewClient ? (
              <div className="space-y-3 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
                <div className="grid gap-2">
                  <Label htmlFor="qc-p-c-name">اسم العميل</Label>
                  <Input
                    id="qc-p-c-name"
                    maxLength={120}
                    value={clientDraft.name}
                    onChange={(e) => setClientDraft({ ...clientDraft, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="qc-p-c-phone">الهاتف</Label>
                    <Input
                      id="qc-p-c-phone"
                      maxLength={40}
                      value={clientDraft.phone}
                      onChange={(e) => setClientDraft({ ...clientDraft, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="qc-p-c-email">البريد</Label>
                    <Input
                      id="qc-p-c-email"
                      type="email"
                      maxLength={255}
                      value={clientDraft.email}
                      onChange={(e) => setClientDraft({ ...clientDraft, email: e.target.value })}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={!clientDraft.name.trim() || createClient.isPending}
                  onClick={() => createClient.mutate()}
                >
                  {createClient.isPending ? "جارٍ الحفظ…" : "حفظ العميل واختياره"}
                </Button>
              </div>
            ) : (
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر العميل" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="qc-p-budget">الميزانية (د.ج)</Label>
              <Input
                id="qc-p-budget"
                type="number"
                min={0}
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qc-p-deadline">الموعد النهائي</Label>
              <Input
                id="qc-p-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
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
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المشروع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewTaskDialog({ trigger }: TriggerProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: team = [] } = useQuery(teamQuery());
  const [form, setForm] = useState({
    title: "",
    project_id: "",
    assignee_id: "",
    priority: "medium" as Priority,
    due_date: "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "tasks", id), {
          title: form.title.trim(),
          description: null,
          project_id: form.project_id,
          sprint_id: null,
          assignee_id: form.assignee_id || null,
          status: "todo",
          priority: form.priority,
          position: 0,
          estimated_hours: 0,
          actual_hours: 0,
          due_date: form.due_date || null,
          created_by: getFirebaseAuth().currentUser?.uid ?? null,
          completed_at: null,
          created_at: now,
          updated_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("تمت إضافة المهمة");
      setOpen(false);
      setForm({ title: "", project_id: "", assignee_id: "", priority: "medium", due_date: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            مهمة جديدة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>مهمة جديدة</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qc-t-title">العنوان</Label>
            <Input
              id="qc-t-title"
              maxLength={160}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المشروع" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>المسؤول</Label>
              <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر عضو الفريق" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name ?? "عضو"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>الأولوية</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as Priority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qc-t-due">تاريخ الاستحقاق</Label>
              <Input
                id="qc-t-due"
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.title.trim() || !form.project_id || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المهمة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function NewSprintDialog({ trigger }: TriggerProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const [form, setForm] = useState({
    name: "",
    project_id: "",
    start_date: "",
    end_date: "",
    progress_mode: "manual" as SprintProgressMode,
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
      setForm({ name: "", project_id: "", start_date: "", end_date: "", progress_mode: "manual", progress_percent: 0 });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {sprintUiLabels.new}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sprintUiLabels.new}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="qc-s-name">{sprintUiLabels.name}</Label>
            <Input
              id="qc-s-name"
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>المشروع</Label>
            <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المشروع" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="qc-s-start">تاريخ البداية</Label>
              <Input
                id="qc-s-start"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qc-s-end">تاريخ النهاية</Label>
              <Input
                id="qc-s-end"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <ProgressModeFields
            mode={form.progress_mode}
            onModeChange={(progress_mode) => setForm({ ...form, progress_mode })}
            percent={form.progress_percent}
            onPercentChange={(progress_percent) => setForm({ ...form, progress_percent })}
            autoHint="تُحسب تلقائياً من مهام الدورة"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.name.trim() || !form.project_id || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : sprintUiLabels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
