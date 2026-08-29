import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
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
import { GripVertical, Timer } from "lucide-react";
import { doc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";

import { NewSprintDialog } from "@/components/create/QuickCreateDialogs";
import { CycleBoardCard } from "@/components/overview/CycleBoardCard";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Sprint, Task } from "@/integrations/firebase/types";
import {
  cycleBoardStageChrome,
  cycleBoardStageLabels,
  cycleOperationalStages,
  resolveCycleBoardStage,
  sprintStatusForBoardStage,
  sprintUiLabels,
  type CycleBoardStage,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

type OperationalStage = Exclude<CycleBoardStage, "completed">;

function sortSprints(list: Sprint[]) {
  return [...list].sort((a, b) => {
    const pos = (a.board_position ?? 0) - (b.board_position ?? 0);
    if (pos !== 0) return pos;
    return a.name.localeCompare(b.name, "ar");
  });
}

function groupSprintsByStage(sprints: Sprint[]) {
  const map = Object.fromEntries(
    cycleOperationalStages.map((s) => [s, [] as Sprint[]]),
  ) as Record<OperationalStage, Sprint[]>;
  for (const s of sprints) {
    const stage = resolveCycleBoardStage(s);
    if (stage === "completed") continue;
    map[stage].push(s);
  }
  for (const col of cycleOperationalStages) map[col] = sortSprints(map[col]);
  return map;
}

type Props = {
  sprints: Sprint[];
  tasks: Task[];
  projectNameById: Map<string, string>;
  canEdit: boolean;
  showCompleted: boolean;
};

export function CycleOverviewBoard({
  sprints,
  tasks,
  projectNameById,
  canEdit,
  showCompleted,
}: Props) {
  const queryClient = useQueryClient();
  const operational = useMemo(
    () => sprints.filter((s) => resolveCycleBoardStage(s) !== "completed"),
    [sprints],
  );
  const completed = useMemo(
    () => sprints.filter((s) => resolveCycleBoardStage(s) === "completed"),
    [sprints],
  );

  const [items, setItems] = useState(operational);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(operational);
  }, [operational]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStage = useMemo(() => groupSprintsByStage(items), [items]);
  const activeSprint = activeId ? items.find((s) => s.id === activeId) ?? null : null;

  const persist = useMutation({
    mutationFn: async (
      updates: {
        id: string;
        board_stage: OperationalStage;
        status: string;
        board_position: number;
      }[],
    ) =>
      withFirebaseError(async () => {
        const batch = writeBatch(getDb());
        const now = nowIso();
        for (const u of updates) {
          batch.update(doc(getDb(), "sprints", u.id), {
            board_stage: u.board_stage,
            status: u.status,
            board_position: u.board_position,
            updated_at: now,
          });
        }
        await batch.commit();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints"] }),
    onError: (e: Error) => {
      setItems(operational);
      toast.error(e.message);
    },
  });

  function findContainer(id: string): OperationalStage | null {
    if (cycleOperationalStages.includes(id as OperationalStage)) {
      return id as OperationalStage;
    }
    const sprint = items.find((s) => s.id === id);
    if (!sprint) return null;
    const stage = resolveCycleBoardStage(sprint);
    return stage === "completed" ? null : stage;
  }

  function onDragStart(event: DragStartEvent) {
    if (!canEdit) return;
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || !canEdit) return;

    const sprintId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(sprintId);
    const to = findContainer(overId);
    if (!from || !to) return;

    const grouped = groupSprintsByStage(items);
    const fromList = [...grouped[from]];
    const toList = from === to ? fromList : [...grouped[to]];

    const oldIndex = fromList.findIndex((s) => s.id === sprintId);
    if (oldIndex < 0) return;

    let newIndex =
      overId === to ? toList.length : toList.findIndex((s) => s.id === overId);
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
      nextTo.splice(Math.min(newIndex, nextTo.length), 0, {
        ...moved,
        board_stage: to,
      });
    }

    const nextGrouped: Record<OperationalStage, Sprint[]> = {
      ...grouped,
      [from]: nextFrom,
      [to]: nextTo,
    };
    if (from === to) nextGrouped[from] = nextFrom;

    const updates: {
      id: string;
      board_stage: OperationalStage;
      status: string;
      board_position: number;
    }[] = [];
    const nextItems: Sprint[] = [];
    for (const col of cycleOperationalStages) {
      nextGrouped[col] = nextGrouped[col].map((s, i) => {
        updates.push({
          id: s.id,
          board_stage: col,
          status: sprintStatusForBoardStage(col),
          board_position: i,
        });
        nextItems.push({ ...s, board_stage: col, board_position: i });
        return { ...s, board_stage: col, board_position: i };
      });
    }

    setItems(nextItems);
    persist.mutate(updates);
  }

  return (
    <div className="flex flex-col">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{sprintUiLabels.module}</h2>
          <p className="text-[11px] text-muted-foreground">اسحب بين المراحل · انقر للتفاصيل</p>
        </div>
        <div className="flex items-center gap-1.5">
          <NewSprintDialog
            trigger={
              <Button size="sm" variant="outline" className="h-8 px-2">
                <Timer className="h-3.5 w-3.5" />
                جديدة
              </Button>
            }
          />
          <Button asChild size="sm" variant="ghost" className="h-8 px-2">
            <Link to="/sprints">الكل</Link>
          </Button>
        </div>
      </header>

      <TooltipProvider delayDuration={250} skipDelayDuration={80} disableHoverableContent>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {cycleOperationalStages.map((stage) => {
            const rows = byStage[stage];
            const chrome = cycleBoardStageChrome[stage];
            return (
              <CycleColumn
                key={stage}
                stage={stage}
                sprints={rows}
                projectNameById={projectNameById}
                tasks={tasks}
                canEdit={canEdit}
                chrome={chrome}
              />
            );
          })}
        </div>

        {showCompleted && completed.length > 0 ? (
          <div className="mt-3 rounded-lg border border-zinc-400/40 bg-zinc-500/5 p-2">
            <h3 className="mb-2 px-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
              {cycleBoardStageLabels.completed} ({completed.length})
            </h3>
            <div className="flex flex-col gap-1.5">
              {completed.map((sprint) => (
                <CycleBoardCard
                  key={sprint.id}
                  sprint={sprint}
                  stage="completed"
                  projectName={projectNameById.get(sprint.project_id) ?? ""}
                  tasks={tasks}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </div>
        ) : null}

        <DragOverlay>
          {activeSprint ? (
            <CycleBoardCard
              sprint={activeSprint}
              stage={resolveCycleBoardStage(activeSprint)}
              projectName={projectNameById.get(activeSprint.project_id) ?? ""}
              tasks={tasks}
              canEdit={canEdit}
              dragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
      </TooltipProvider>
    </div>
  );
}

function CycleColumn({
  stage,
  sprints,
  projectNameById,
  tasks,
  canEdit,
  chrome,
}: {
  stage: OperationalStage;
  sprints: Sprint[];
  projectNameById: Map<string, string>;
  tasks: Task[];
  canEdit: boolean;
  chrome: (typeof cycleBoardStageChrome)[CycleBoardStage];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[14rem] flex-col overflow-hidden rounded-lg border p-0 transition-colors",
        chrome.border,
        isOver && "ring-2 ring-primary/40",
      )}
    >
      <header
        className={cn(
          "relative flex shrink-0 items-center justify-between gap-2 px-2.5 py-2",
          chrome.header,
        )}
      >
        <span className={cn("absolute inset-y-0 start-0 w-1", chrome.accent)} aria-hidden />
        <h3 className="ps-1.5 text-xs font-bold leading-tight">{cycleBoardStageLabels[stage]}</h3>
        <span
          className={cn(
            "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-black tabular-nums",
            chrome.count,
          )}
        >
          {sprints.length}
        </span>
      </header>
      <SortableContext items={sprints.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
          {sprints.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6">
              <p className="text-[10px] text-muted-foreground">
                {canEdit ? "اسحب دورة هنا" : "لا دورات"}
              </p>
              {canEdit && stage === "waiting" ? (
                <NewSprintDialog
                  trigger={
                    <Button size="sm" variant="ghost" className="mt-1 h-7 text-[10px]">
                      <Timer className="h-3 w-3" />
                      إضافة
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : (
            sprints.map((sprint) => (
              <SortableCycleCard
                key={sprint.id}
                sprint={sprint}
                stage={stage}
                projectName={projectNameById.get(sprint.project_id) ?? ""}
                tasks={tasks}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCycleCard({
  sprint,
  stage,
  projectName,
  tasks,
  canEdit,
}: {
  sprint: Sprint;
  stage: OperationalStage;
  projectName: string;
  tasks: Task[];
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sprint.id,
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
      <CycleBoardCard
        sprint={sprint}
        stage={stage}
        projectName={projectName}
        tasks={tasks}
        canEdit={canEdit}
        dragHandle={
          canEdit ? (
            <button
              type="button"
              className="shrink-0 touch-none rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              aria-label="سحب الدورة"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3 w-3" />
            </button>
          ) : null
        }
      />
    </div>
  );
}
