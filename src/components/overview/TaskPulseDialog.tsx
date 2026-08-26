import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus, Sparkles } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Task } from "@/integrations/firebase/types";
import {
  priorityLabels,
  taskPulseCopy,
  type Priority,
  type TaskStatus,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

const statusFlow: TaskStatus[] = ["backlog", "in_progress", "done"];

const statusChipClass: Record<TaskStatus, string> = {
  todo: "border-sky-400/50 data-[on=true]:bg-sky-500 data-[on=true]:text-white",
  in_progress: "border-emerald-400/50 data-[on=true]:bg-emerald-600 data-[on=true]:text-white",
  review: "border-violet-400/50 data-[on=true]:bg-violet-600 data-[on=true]:text-white",
  done: "border-amber-400/50 data-[on=true]:bg-amber-500 data-[on=true]:text-white",
  backlog: "border-slate-400/50 data-[on=true]:bg-slate-600 data-[on=true]:text-white",
};

type Props = {
  task: Task | null;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskPulseDialog({ task, projectName, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open || !task) return;
    setStatus(task.status === "done" ? "done" : task.status === "in_progress" ? "in_progress" : "backlog");
    setPriority((task.priority as Priority) in priorityLabels ? (task.priority as Priority) : "medium");
    setNote(task.description ?? "");
  }, [open, task]);

  const save = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "tasks", task.id), {
          status,
          priority,
          description: note.trim() || null,
          completed_at: status === "done" ? task.completed_at ?? nowIso() : null,
          updated_at: nowIso(),
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      const copy = taskPulseCopy[status];
      if (status === "done") {
        toast.success(copy.cheer, { description: "خذ لحظة فخر صغيرة — ثم المهمة التالية." });
      } else {
        toast.success(copy.cheer);
      }
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!task) return null;

  const pulse = taskPulseCopy[status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/15 via-card to-card px-5 py-5">
          <Sparkles className="absolute end-4 top-4 h-5 w-5 text-primary/50" aria-hidden />
          <DialogHeader className="gap-1.5 text-start">
            <DialogTitle className="pe-8 text-base leading-snug">{task.title}</DialogTitle>
            <DialogDescription className="text-xs">
              {projectName ? `${projectName} · ` : ""}
              {pulse.nudge}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">أين المهمة الآن؟</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {statusFlow.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-on={status === s}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-xl border bg-card px-2.5 py-2.5 text-start text-xs font-semibold transition-all hover:scale-[1.02]",
                    statusChipClass[s],
                    status === s && "shadow-md",
                  )}
                >
                  {taskPulseCopy[s].action}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">الأولوية</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(priorityLabels) as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    priority === p
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  {priorityLabels[p]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-pulse-note" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              نبضة سريعة / ملاحظة
            </Label>
            <Textarea
              id="task-pulse-note"
              maxLength={500}
              rows={3}
              placeholder="ما الذي يعمل؟ ما العائق؟ أو جملة تشجيع لنفسك…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none rounded-xl bg-muted/20"
            />
            <p className="text-[11px] leading-relaxed text-muted-foreground">{pulse.nudge}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border bg-muted/15 px-5 py-3 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            لاحقاً
          </Button>
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "جارٍ الحفظ…" : status === "done" ? "حفظ واكتمال" : "حفظ النبضة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
