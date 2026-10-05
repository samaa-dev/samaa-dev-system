import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SitePageSection } from "@/lib/site-sections";
import { sectionDisplayName } from "@/lib/site-sections";
import { pick } from "@/lib/i18n/localized";
import { cn } from "@/lib/utils";

function SortableRow({
  section,
  index,
  onToggleVisible,
}: {
  section: SitePageSection;
  index: number;
  onToggleVisible: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3",
        isDragging && "z-10 border-primary shadow-lg opacity-95",
      )}
    >
      <button
        type="button"
        className="touch-none flex size-9 shrink-0 cursor-grab items-center justify-center rounded-lg bg-muted text-muted-foreground active:cursor-grabbing"
        aria-label="اسحب للترتيب"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{sectionDisplayName(section)}</div>
        <div className="truncate text-xs text-muted-foreground">
          {section.kind === "custom" ? "قسم حر" : "قسم نظام"} ·{" "}
          {pick(section.nav_label, "ar") || "بدون قائمة"}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={section.visible ? "default" : "outline"}
        onClick={onToggleVisible}
      >
        {section.visible ? (
          <>
            <Eye className="h-4 w-4" /> ظاهر
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4" /> مخفي
          </>
        )}
      </Button>
    </div>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: SitePageSection[];
  onApply: (sections: SitePageSection[]) => void;
  saving?: boolean;
};

export function SectionOrderDialog({ open, onOpenChange, sections, onApply, saving }: Props) {
  const [draft, setDraft] = useState<SitePageSection[]>([]);

  useEffect(() => {
    if (!open) return;
    setDraft([...sections].sort((a, b) => a.sort_order - b.sort_order));
  }, [open, sections]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setDraft((prev) => {
      const oldIndex = prev.findIndex((s) => s.id === active.id);
      const newIndex = prev.findIndex((s) => s.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex).map((s, i) => ({ ...s, sort_order: i }));
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ترتيب أقسام الموقع</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          اضغط مطولاً على أيقونة السحب ثم حرّك الصف (Hold & drag).
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={draft.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="max-h-[50vh] space-y-2 overflow-y-auto py-1">
              {draft.map((section, index) => (
                <SortableRow
                  key={section.id}
                  section={section}
                  index={index}
                  onToggleVisible={() =>
                    setDraft((prev) =>
                      prev.map((s) =>
                        s.id === section.id ? { ...s, visible: !s.visible } : s,
                      ),
                    )
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            disabled={saving || draft.length === 0}
            onClick={() => onApply(draft.map((s, i) => ({ ...s, sort_order: i })))}
          >
            حفظ الترتيب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
