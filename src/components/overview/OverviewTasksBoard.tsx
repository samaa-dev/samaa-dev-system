import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, GripVertical, MessageCircle } from "lucide-react";
import { doc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";

import { TaskPulseDialog } from "@/components/overview/TaskPulseDialog";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Task } from "@/integrations/firebase/types";
import {
  overviewTaskLaneLabels,
  priorityLabels,
  resolveOverviewTaskLane,
  type Priority,
  type TaskStatus,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

const overviewColumns: TaskStatus[] = ["backlog", "in_progress"];

const priorityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

const columnChrome: Record<TaskStatus, string> = {
  backlog: "border-slate-400/35 bg-slate-500/5",
  in_progress: "border-emerald-400/35 bg-emerald-500/5",
  todo: "border-slate-400/35 bg-slate-500/5",
  review: "border-slate-400/35 bg-slate-500/5",
  done: "border-border bg-muted/20",
};

function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    const pr = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
    if (pr !== 0) return pr;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

function normalizeStatus(status: string): TaskStatus {
  return status === "in_progress" ? "in_progress" : "backlog";
}

function groupByStatus(list: Task[]) {
  const map = Object.fromEntries(overviewColumns.map((s) => [s, [] as Task[]])) as Record<
    TaskStatus,
    Task[]
  >;
  for (const t of list) {
    if (resolveOverviewTaskLane(t.status) === "done_today") continue;
    map[normalizeStatus(t.status)].push(t);
  }
  for (const s of overviewColumns) map[s] = sortTasks(map[s]);
  return map;
}

type Props = {
  tasks: Task[];
  projectNameById: Map<string, string>;
  canEdit: boolean;
};

export function OverviewTasksBoard({ tasks, projectNameById, canEdit }: Props) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pulseTask, setPulseTask] = useState<Task | null>(null);

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => groupByStatus(items), [items]);
  const activeTask = activeId ? items.find((t) => t.id === activeId) ?? null : null;
  const [showCompleted, setShowCompleted] = useState(false);

  const completedToday = useMemo(
    () =>
      sortTasks(
        items.filter((t) => {
          if (t.status !== "done" || !t.completed_at) return false;
          return new Date(t.completed_at).toDateString() === new Date().toDateString();
        }),
      ),
    [items],
  );

  const persist = useMutation({
    mutationFn: async (updates: { id: string; status: TaskStatus; position: number }[]) =>
      withFirebaseError(async () => {
        const batch = writeBatch(getDb());
        const now = nowIso();
        for (const u of updates) {
          batch.update(doc(getDb(), "tasks", u.id), {
            status: u.status,
            position: u.position,
            completed_at: u.status === "done" ? now : null,
            updated_at: now,
          });
        }
        await batch.commit();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onError: (e: Error) => {
      setItems(tasks);
      toast.error(e.message);
    },
  });

  function findContainer(id: string): TaskStatus | null {
    if (overviewColumns.includes(id as TaskStatus)) return id as TaskStatus;
    const task = items.find((t) => t.id === id);
    return task ? normalizeStatus(task.status) : null;
  }

  function onDragStart(event: DragStartEvent) {
    if (!canEdit) return;
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !canEdit) return;

    const activeTaskId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeTaskId);
    const to = findContainer(overId);
    if (!from || !to) return;

    const grouped = groupByStatus(items);
    const fromList = [...grouped[from]];
    const toList = from === to ? fromList : [...grouped[to]];

    const oldIndex = fromList.findIndex((t) => t.id === activeTaskId);
    if (oldIndex < 0) return;

    let newIndex =
      overId === to ? toList.length : toList.findIndex((t) => t.id === overId);
    if (newIndex < 0) newIndex = toList.length;

    let nextFrom = fromList;
    let nextTo = toList;

    if (from === to) {
      if (oldIndex === newIndex) return;
      nextFrom = arrayMove(fromList, oldIndex, Math.min(newIndex, fromList.length - 1));
      nextTo = nextFrom;
    } else {
      nextFrom = [...fromList];
      const [moved] = nextFrom.splice(oldIndex, 1);
      nextTo = [...toList];
      nextTo.splice(Math.min(newIndex, nextTo.length), 0, { ...moved, status: to });
    }

    const nextGrouped: Record<TaskStatus, Task[]> = { ...grouped, [from]: nextFrom, [to]: nextTo };
    if (from === to) nextGrouped[from] = nextFrom;

    const updates: { id: string; status: TaskStatus; position: number }[] = [];
    for (const col of overviewColumns) {
      nextGrouped[col] = nextGrouped[col].map((t, i) => {
        updates.push({ id: t.id, status: col, position: i });
        return { ...t, status: col, position: i };
      });
    }

    setItems(overviewColumns.flatMap((col) => nextGrouped[col]));
    persist.mutate(updates);
  }

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">لا توجد مهام مفتوحة.</p>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {overviewColumns.map((status) => (
            <TaskColumn
              key={status}
              status={status}
              tasks={byStatus[status]}
              projectNameById={projectNameById}
              canEdit={canEdit}
              onOpenPulse={setPulseTask}
            />
          ))}
        </div>
        <section className="mt-3 rounded-xl border border-border bg-muted/15">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <div>
                <p className="text-sm font-semibold">المهام المكتملة اليوم</p>
                <p className="text-[11px] text-muted-foreground">عرض هادئ بعيد عن التشتيت</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-background px-2 py-1 text-xs font-bold tabular-nums">
                {completedToday.length}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showCompleted && "rotate-180")} />
            </div>
          </button>
          {showCompleted ? (
            <div className="border-t border-border px-3 py-3">
              {completedToday.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">لا توجد مهام مكتملة اليوم.</p>
              ) : (
                <div className="grid gap-2">
                  {completedToday.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectName={projectNameById.get(t.project_id) ?? "مشروع"}
                      onOpen={canEdit ? () => setPulseTask(t) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </section>
        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              projectName={projectNameById.get(activeTask.project_id) ?? "مشروع"}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskPulseDialog
        task={pulseTask}
        projectName={pulseTask ? projectNameById.get(pulseTask.project_id) : undefined}
        open={Boolean(pulseTask)}
        onOpenChange={(o) => {
          if (!o) setPulseTask(null);
        }}
      />
    </>
  );
}

function TaskColumn({
  status,
  tasks,
  projectNameById,
  canEdit,
  onOpenPulse,
}: {
  status: TaskStatus;
  tasks: Task[];
  projectNameById: Map<string, string>;
  canEdit: boolean;
  onOpenPulse: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[12rem] flex-col rounded-xl border p-2.5 transition-colors",
        columnChrome[status],
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <header className="mb-2 flex items-center justify-between gap-2 px-1">
        <h3 className="text-xs font-bold">{overviewTaskLaneLabels[status === "in_progress" ? "in_progress" : "waiting"]}</h3>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-background/80 px-1.5 text-xs font-black tabular-nums shadow-sm">
          {tasks.length}
        </span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-muted-foreground">اسحب مهمة هنا</p>
          ) : (
            tasks.map((t) => (
              <SortableTaskCard
                key={t.id}
                task={t}
                projectName={projectNameById.get(t.project_id) ?? "مشروع"}
                canEdit={canEdit}
                onOpenPulse={() => onOpenPulse(t)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({
  task,
  projectName,
  canEdit,
  onOpenPulse,
}: {
  task: Task;
  projectName: string;
  canEdit: boolean;
  onOpenPulse: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canEdit,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(isDragging && "opacity-40")}
    >
      <TaskCard
        task={task}
        projectName={projectName}
        onOpen={canEdit ? onOpenPulse : undefined}
        dragHandle={
          canEdit ? (
            <button
              type="button"
              className="mt-0.5 touch-none rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="سحب المهمة"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
      />
    </div>
  );
}

function TaskCard({
  task,
  projectName,
  dragHandle,
  dragging,
  onOpen,
}: {
  task: Task;
  projectName: string;
  dragHandle?: ReactNode;
  dragging?: boolean;
  onOpen?: () => void;
}) {
  const priority = task.priority as Priority;
  const note = task.description?.trim();
  const priorityCardClass =
    priority === "high"
      ? "border-destructive/40 bg-destructive/5"
      : priority === "medium"
        ? "border-amber-400/45 bg-amber-500/5"
        : "border-sky-400/40 bg-sky-500/5";

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-lg border bg-card p-2.5 shadow-sm transition-all",
        priorityCardClass,
        dragging && "shadow-lg ring-2 ring-primary/30",
        onOpen && "cursor-pointer hover:border-primary/35 hover:shadow-md",
      )}
    >
      <div className="flex items-start gap-1.5">
        {dragHandle ? (
          <span
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="contents"
          >
            {dragHandle}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{projectName}</p>
          {note ? (
            <p className="mt-1.5 line-clamp-2 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
              <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
              <span>{note}</span>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              {priorityLabels[priority] ?? task.priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
