import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, MessageSquare, MoreHorizontal, Pencil, Timer } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";

import { NewSprintDialog, NewTaskDialog } from "@/components/create/QuickCreateDialogs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { sprintUiLabels } from "@/lib/samaa";

type BoardCollection = "projects" | "sprints";

export function BoardCardQuickMenu({
  onEdit,
  onAddTask,
  onAddSprint,
  onQuickNote,
}: {
  onEdit?: () => void;
  onAddTask?: () => void;
  onAddSprint?: () => void;
  onQuickNote?: () => void;
}) {
  const hasActions = onEdit || onAddTask || onAddSprint || onQuickNote;
  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="اختصارات"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {onAddTask ? (
          <DropdownMenuItem onSelect={onAddTask}>
            <ListChecks className="h-3.5 w-3.5" />
            مهمة جديدة
          </DropdownMenuItem>
        ) : null}
        {onAddSprint ? (
          <DropdownMenuItem onSelect={onAddSprint}>
            <Timer className="h-3.5 w-3.5" />
            {sprintUiLabels.new}
          </DropdownMenuItem>
        ) : null}
        {onQuickNote ? (
          <DropdownMenuItem onSelect={onQuickNote}>
            <MessageSquare className="h-3.5 w-3.5" />
            ملاحظة
          </DropdownMenuItem>
        ) : null}
        {onEdit ? (
          <>
            {onAddTask || onAddSprint || onQuickNote ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
              تعديل المرحلة
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BoardQuickNoteDialog({
  open,
  onOpenChange,
  collection,
  docId,
  title,
  initialNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: BoardCollection;
  docId: string;
  title: string;
  initialNote?: string | null;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(initialNote ?? "");

  useEffect(() => {
    if (!open) return;
    setNote(initialNote ?? "");
  }, [open, initialNote]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const trimmed = note.trim();
        await updateDoc(doc(getDb(), collection, docId), {
          board_note: trimmed || null,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [collection] });
      toast.success("تم حفظ الملاحظة");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-base">ملاحظة تشغيلية</DialogTitle>
          <p className="text-xs text-muted-foreground">{title}</p>
        </DialogHeader>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثال: بانتظار موافقة العميل…"
          maxLength={200}
          rows={3}
          className="resize-none text-sm"
        />
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectCardShortcuts({
  projectId,
  projectName,
  boardNote,
  canEdit,
  onEdit,
}: {
  projectId: string;
  projectName: string;
  boardNote?: string | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [sprintOpen, setSprintOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <BoardCardQuickMenu
        onAddTask={() => setTaskOpen(true)}
        onAddSprint={() => setSprintOpen(true)}
        onQuickNote={() => setNoteOpen(true)}
        onEdit={onEdit}
      />
      <NewTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultProjectId={projectId}
      />
      <NewSprintDialog
        open={sprintOpen}
        onOpenChange={setSprintOpen}
        defaultProjectId={projectId}
      />
      <BoardQuickNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        collection="projects"
        docId={projectId}
        title={projectName}
        initialNote={boardNote}
      />
    </>
  );
}

export function CycleCardShortcuts({
  sprintId,
  projectId,
  sprintName,
  boardNote,
  canEdit,
  onEdit,
}: {
  sprintId: string;
  projectId: string;
  sprintName: string;
  boardNote?: string | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <>
      <BoardCardQuickMenu
        onAddTask={() => setTaskOpen(true)}
        onQuickNote={() => setNoteOpen(true)}
        onEdit={onEdit}
      />
      <NewTaskDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        defaultProjectId={projectId}
        defaultSprintId={sprintId}
      />
      <BoardQuickNoteDialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        collection="sprints"
        docId={sprintId}
        title={sprintName}
        initialNote={boardNote}
      />
    </>
  );
}
