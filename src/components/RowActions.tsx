import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RowActions({
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  if (!canEdit && !canDelete) return null;
  return (
    <div className="flex items-center gap-1">
      {canEdit && onEdit ? (
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="تعديل">
          <Pencil className="h-4 w-4" />
        </Button>
      ) : null}
      {canDelete && onDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="حذف"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
