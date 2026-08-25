import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** value used for sorting and searching */
  value?: (row: T) => string | number | null | undefined;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder = "بحث…",
  emptyState = "لا توجد بيانات بعد.",
  toolbar,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  emptyState?: ReactNode;
  toolbar?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const visible = useMemo(() => {
    const q = term.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter((row) =>
        columns.some((c) => String(c.value?.(row) ?? "").toLowerCase().includes(q)),
      );
    }
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.value) {
        list = [...list].sort((a, b) => {
          const av = col.value!(a);
          const bv = col.value!(b);
          if (typeof av === "number" && typeof bv === "number") {
            return sort.dir === "asc" ? av - bv : bv - av;
          }
          const cmp = String(av ?? "").localeCompare(String(bv ?? ""), "ar");
          return sort.dir === "asc" ? cmp : -cmp;
        });
      }
    }
    return list;
  }, [rows, columns, term, sort]);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchPlaceholder}
            className="pe-9"
          />
        </div>
        {toolbar}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={cn("text-start", col.className)}>
                  {col.value ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      onClick={() =>
                        setSort((prev) =>
                          prev?.key === col.key
                            ? { key: col.key, dir: prev.dir === "asc" ? "desc" : "asc" }
                            : { key: col.key, dir: "asc" },
                        )
                      }
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              visible.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(onRowClick && "cursor-pointer")}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
