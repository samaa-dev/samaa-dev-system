import { useEffect, useMemo, useState } from "react";
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
import { FolderKanban, GripVertical } from "lucide-react";
import { doc, writeBatch } from "firebase/firestore";
import { toast } from "sonner";

import { NewProjectDialog } from "@/components/create/QuickCreateDialogs";
import { ProjectBoardCard } from "@/components/overview/ProjectBoardCard";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { Milestone, Project, Task } from "@/integrations/firebase/types";
import {
  boardStageChrome,
  boardStageLabels,
  boardStages,
  projectCompletedLabel,
  projectStatusForBoardStage,
  resolveBoardStage,
  type BoardStage,
  type ProjectBoardLane,
} from "@/lib/samaa";
import { cn } from "@/lib/utils";

function sortProjects(list: Project[]) {
  return [...list].sort((a, b) => {
    const pos = (a.board_position ?? 0) - (b.board_position ?? 0);
    if (pos !== 0) return pos;
    return a.name.localeCompare(b.name, "ar");
  });
}

function groupProjectsByStage(projects: Project[]) {
  const map = Object.fromEntries(boardStages.map((s) => [s, [] as Project[]])) as Record<
    BoardStage,
    Project[]
  >;
  for (const p of projects) {
    const stage = resolveBoardStage(p);
    if (stage === "completed") continue;
    map[stage].push(p);
  }
  for (const s of boardStages) map[s] = sortProjects(map[s]);
  return map;
}

type Props = {
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  canEdit: boolean;
  showCompleted: boolean;
};

export function ProjectOverviewBoard({
  projects,
  tasks,
  milestones,
  canEdit,
  showCompleted,
}: Props) {
  const queryClient = useQueryClient();
  const operational = useMemo(
    () => projects.filter((p) => resolveBoardStage(p) !== "completed"),
    [projects],
  );
  const completed = useMemo(
    () => projects.filter((p) => resolveBoardStage(p) === "completed"),
    [projects],
  );

  const [items, setItems] = useState(operational);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(operational);
  }, [operational]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStage = useMemo(() => groupProjectsByStage(items), [items]);
  const activeProject = activeId ? items.find((p) => p.id === activeId) ?? null : null;

  const persist = useMutation({
    mutationFn: async (
      updates: { id: string; board_stage: BoardStage; status: string; board_position: number }[],
    ) =>
      withFirebaseError(async () => {
        const batch = writeBatch(getDb());
        const now = nowIso();
        for (const u of updates) {
          batch.update(doc(getDb(), "projects", u.id), {
            board_stage: u.board_stage,
            status: u.status,
            board_position: u.board_position,
            updated_at: now,
          });
        }
        await batch.commit();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
    onError: (e: Error) => {
      setItems(operational);
      toast.error(e.message);
    },
  });

  function findContainer(id: string): BoardStage | null {
    if (boardStages.includes(id as BoardStage)) return id as BoardStage;
    const project = items.find((p) => p.id === id);
    if (!project) return null;
    const stage = resolveBoardStage(project);
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

    const projectId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(projectId);
    const to = findContainer(overId);
    if (!from || !to) return;

    const grouped = groupProjectsByStage(items);
    const fromList = [...grouped[from]];
    const toList = from === to ? fromList : [...grouped[to]];

    const oldIndex = fromList.findIndex((p) => p.id === projectId);
    if (oldIndex < 0) return;

    let newIndex =
      overId === to ? toList.length : toList.findIndex((p) => p.id === overId);
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

    const nextGrouped: Record<BoardStage, Project[]> = {
      ...grouped,
      [from]: nextFrom,
      [to]: nextTo,
    };
    if (from === to) nextGrouped[from] = nextFrom;

    const updates: { id: string; board_stage: BoardStage; status: string; board_position: number }[] =
      [];
    const nextItems: Project[] = [];
    for (const col of boardStages) {
      nextGrouped[col] = nextGrouped[col].map((p, i) => {
        updates.push({
          id: p.id,
          board_stage: col,
          status: projectStatusForBoardStage(col),
          board_position: i,
        });
        nextItems.push({ ...p, board_stage: col, board_position: i });
        return { ...p, board_stage: col, board_position: i };
      });
    }

    setItems(nextItems);
    persist.mutate(updates);
  }

  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={80} disableHoverableContent>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {boardStages.map((stage) => {
          const rows = byStage[stage];
          const chrome = boardStageChrome[stage];
          return (
            <ProjectColumn
              key={stage}
              stage={stage}
              projects={rows}
              tasks={tasks}
              milestones={milestones}
              canEdit={canEdit}
              chrome={chrome}
            />
          );
        })}
      </div>

      {showCompleted && completed.length > 0 ? (
        <div className="mt-3 rounded-lg border border-zinc-400/40 bg-zinc-500/5 p-2">
          <h3 className="mb-2 px-1 text-[11px] font-bold text-zinc-700 dark:text-zinc-200">
            {projectCompletedLabel} ({completed.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {completed.map((project) => (
              <ProjectBoardCard
                key={project.id}
                project={project}
                stage={"completed" as ProjectBoardLane}
                tasks={tasks}
                milestones={milestones}
                canEdit={canEdit}
              />
            ))}
          </div>
        </div>
      ) : null}

      <DragOverlay>
        {activeProject ? (
          <ProjectBoardCard
            project={activeProject}
            stage={resolveBoardStage(activeProject) as ProjectBoardLane}
            tasks={tasks}
            milestones={milestones}
            canEdit={canEdit}
            dragging
          />
        ) : null}
      </DragOverlay>
    </DndContext>
    </TooltipProvider>
  );
}

function ProjectColumn({
  stage,
  projects,
  tasks,
  milestones,
  canEdit,
  chrome,
}: {
  stage: BoardStage;
  projects: Project[];
  tasks: Task[];
  milestones: Milestone[];
  canEdit: boolean;
  chrome: (typeof boardStageChrome)[BoardStage];
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
          "relative flex shrink-0 items-center justify-between gap-2 px-2 py-2",
          chrome.header,
        )}
      >
        <span className={cn("absolute inset-y-0 start-0 w-1", chrome.accent)} aria-hidden />
        <h3 className="ps-1.5 text-[11px] font-bold leading-tight">{boardStageLabels[stage]}</h3>
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-xs font-black tabular-nums",
            chrome.count,
          )}
        >
          {projects.length}
        </span>
      </header>
      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-1.5">
          {projects.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-4">
              <p className="text-[10px] text-muted-foreground">
                {canEdit ? "اسحب مشروعاً هنا" : "لا مشاريع"}
              </p>
              {canEdit && stage === "waiting" ? (
                <NewProjectDialog
                  trigger={
                    <Button size="sm" variant="ghost" className="mt-1 h-7 text-[10px]">
                      <FolderKanban className="h-3 w-3" />
                      إضافة
                    </Button>
                  }
                />
              ) : null}
            </div>
          ) : (
            projects.map((project) => (
              <SortableProjectCard
                key={project.id}
                project={project}
                stage={stage}
                tasks={tasks}
                milestones={milestones}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableProjectCard({
  project,
  stage,
  tasks,
  milestones,
  canEdit,
}: {
  project: Project;
  stage: BoardStage;
  tasks: Task[];
  milestones: Milestone[];
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
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
      <ProjectBoardCard
        project={project}
        stage={stage}
        tasks={tasks}
        milestones={milestones}
        canEdit={canEdit}
        dragHandle={
          canEdit ? (
            <button
              type="button"
              className="shrink-0 touch-none rounded p-0.5 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
              aria-label="سحب المشروع"
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
