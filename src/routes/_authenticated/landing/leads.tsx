import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import {
  Building2,
  Columns3,
  Copy,
  MessageCircle,
  Activity,
  Users,
  AlertTriangle,
  Eye,
  Trash2,
  CopyCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LandingShell } from "@/components/landing/LandingShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteAuditLead, SiteAuditLeadStatus } from "@/integrations/firebase/types";
import { withFirebaseError } from "@/integrations/firebase/helpers";
import { siteAuditLeadsQuery } from "@/lib/data";
import { SITE_AUDIT_LEAD_STATUS_LABELS } from "@/lib/site-defaults";
import { formatDateTime } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/landing/leads")({
  head: () => ({
    meta: [
      { title: "طلبات صفحة الهبوط — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingLeadsPage,
});

const COLS_KEY = "landing_leads_visible_columns";

type ColKey =
  | "name"
  | "whatsapp"
  | "business_type"
  | "monthly_volume"
  | "team_size"
  | "challenges"
  | "step"
  | "status"
  | "repeat"
  | "created_at";

const COL_DEFS: { key: ColKey; label: string; defaultOn: boolean }[] = [
  { key: "name", label: "الاسم", defaultOn: true },
  { key: "whatsapp", label: "واتساب", defaultOn: true },
  { key: "business_type", label: "النشاط", defaultOn: true },
  { key: "monthly_volume", label: "المعاملات", defaultOn: false },
  { key: "team_size", label: "الفريق", defaultOn: false },
  { key: "challenges", label: "العوائق", defaultOn: false },
  { key: "step", label: "المرحلة", defaultOn: true },
  { key: "status", label: "الحالة", defaultOn: true },
  { key: "repeat", label: "تكرار", defaultOn: true },
  { key: "created_at", label: "التاريخ والوقت", defaultOn: true },
];

function defaultVisible(): Record<ColKey, boolean> {
  return Object.fromEntries(COL_DEFS.map((c) => [c.key, c.defaultOn])) as Record<ColKey, boolean>;
}

function loadVisible(): Record<ColKey, boolean> {
  try {
    const raw = localStorage.getItem(COLS_KEY);
    if (!raw) return defaultVisible();
    const parsed = JSON.parse(raw) as Partial<Record<ColKey, boolean>>;
    return { ...defaultVisible(), ...parsed };
  } catch {
    return defaultVisible();
  }
}

function toneFor(status: SiteAuditLeadStatus) {
  if (status === "qualified") return "success" as const;
  if (status === "contacted") return "info" as const;
  if (status === "closed") return "muted" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

function summaryText(l: SiteAuditLead) {
  return [
    `الاسم: ${l.name || "—"}`,
    `واتساب: ${l.whatsapp || "—"}`,
    `النشاط: ${l.business_type}`,
    `المعاملات: ${l.monthly_volume || "—"}`,
    `الفريق: ${l.team_size || "—"}`,
    `التحديات: ${(l.challenges ?? []).join(" · ") || "—"}`,
    `المرحلة: ${l.step_label || l.step_reached}`,
    `مفتاح الزائر: ${l.visitor_key || "—"}`,
    l.is_repeat ? "تكرار: نعم" : "",
    `الوقت: ${formatDateTime(l.created_at)}`,
    l.notes?.trim() ? `ملاحظات: ${l.notes.trim()}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function isDuplicateLead(l: SiteAuditLead, counts: Map<string, number>) {
  if (l.is_repeat) return true;
  const key = l.visitor_key?.trim();
  if (!key) return false;
  return (counts.get(key) ?? 0) > 1;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/30 px-3.5 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-medium leading-snug text-foreground">{value || "—"}</div>
      </div>
    </div>
  );
}

function LandingLeadsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const leads = useQuery({ ...siteAuditLeadsQuery(), enabled });

  const [visible, setVisible] = useState<Record<ColKey, boolean>>(defaultVisible);
  const [selected, setSelected] = useState<SiteAuditLead | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setVisible(loadVisible());
  }, []);

  const toggleCol = (key: ColKey) => {
    setVisible((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const openDetails = (l: SiteAuditLead) => {
    setSelected(l);
    setNotesDraft(l.notes ?? "");
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SiteAuditLeadStatus }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_audit_leads", id), { status });
      }),
    onSuccess: async (_d, vars) => {
      toast.success("تم تحديث الحالة");
      await queryClient.invalidateQueries({ queryKey: ["site-audit-leads"] });
      setSelected((prev) => (prev?.id === vars.id ? { ...prev, status: vars.status } : prev));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_audit_leads", id), {
          notes: notes.trim().slice(0, 2000),
        });
      }),
    onSuccess: async (_d, vars) => {
      toast.success("تم حفظ الملاحظات");
      await queryClient.invalidateQueries({ queryKey: ["site-audit-leads"] });
      setSelected((prev) =>
        prev?.id === vars.id ? { ...prev, notes: vars.notes.trim().slice(0, 2000) } : prev,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_audit_leads", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["site-audit-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copySummary = async (l: SiteAuditLead) => {
    try {
      await navigator.clipboard.writeText(summaryText(l));
      toast.success("تم نسخ الملخص");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const visitorCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of leads.data ?? []) {
      const key = row.visitor_key?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [leads.data]);

  const columns = useMemo(() => {
    const cols = [];

    if (visible.name) {
      cols.push({
        key: "name",
        header: "الاسم",
        value: (l: SiteAuditLead) => l.name || "زائر",
        cell: (l: SiteAuditLead) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{l.name?.trim() || "زائر (لم يُكمل)"}</span>
            {isDuplicateLead(l, visitorCounts) ? (
              <StatusBadge tone="warning">مكرر</StatusBadge>
            ) : null}
          </div>
        ),
      });
    }
    if (visible.whatsapp) {
      cols.push({
        key: "whatsapp",
        header: "واتساب",
        value: (l: SiteAuditLead) => l.whatsapp,
        cell: (l: SiteAuditLead) => (
          <span className="text-sm text-muted-foreground" dir="ltr">
            {l.whatsapp || "—"}
          </span>
        ),
      });
    }
    if (visible.business_type) {
      cols.push({
        key: "business_type",
        header: "النشاط",
        value: (l: SiteAuditLead) => l.business_type,
        cell: (l: SiteAuditLead) => <span className="text-sm">{l.business_type || "—"}</span>,
      });
    }
    if (visible.monthly_volume) {
      cols.push({
        key: "monthly_volume",
        header: "المعاملات",
        value: (l: SiteAuditLead) => l.monthly_volume,
        cell: (l: SiteAuditLead) => (
          <span className="text-sm text-muted-foreground">{l.monthly_volume || "—"}</span>
        ),
      });
    }
    if (visible.team_size) {
      cols.push({
        key: "team_size",
        header: "الفريق",
        value: (l: SiteAuditLead) => l.team_size,
        cell: (l: SiteAuditLead) => (
          <span className="text-sm text-muted-foreground">{l.team_size || "—"}</span>
        ),
      });
    }
    if (visible.challenges) {
      cols.push({
        key: "challenges",
        header: "العوائق",
        value: (l: SiteAuditLead) => (l.challenges ?? []).join(" "),
        cell: (l: SiteAuditLead) => (
          <span className="line-clamp-1 max-w-[12rem] text-sm text-muted-foreground">
            {(l.challenges ?? []).join(" · ") || "—"}
          </span>
        ),
      });
    }
    if (visible.step) {
      cols.push({
        key: "step",
        header: "المرحلة",
        value: (l: SiteAuditLead) => l.step_label || String(l.step_reached ?? ""),
        cell: (l: SiteAuditLead) => (
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
            {l.step_label || `خطوة ${l.step_reached ?? "—"}`}
          </span>
        ),
      });
    }
    if (visible.status) {
      cols.push({
        key: "status",
        header: "الحالة",
        value: (l: SiteAuditLead) => l.status,
        cell: (l: SiteAuditLead) => (
          <StatusBadge tone={toneFor(l.status)}>
            {SITE_AUDIT_LEAD_STATUS_LABELS[l.status] ?? l.status}
          </StatusBadge>
        ),
      });
    }
    if (visible.repeat) {
      cols.push({
        key: "repeat",
        header: "تكرار",
        value: (l: SiteAuditLead) =>
          isDuplicateLead(l, visitorCounts) ? "مكرر" : "أول مرة",
        cell: (l: SiteAuditLead) =>
          isDuplicateLead(l, visitorCounts) ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <CopyCheck className="h-3.5 w-3.5" />
              مكرر
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">أول مرة</span>
          ),
      });
    }
    if (visible.created_at) {
      cols.push({
        key: "created_at",
        header: "التاريخ والوقت",
        value: (l: SiteAuditLead) => l.created_at,
        cell: (l: SiteAuditLead) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDateTime(l.created_at)}
          </span>
        ),
      });
    }

    cols.push({
      key: "actions",
      header: "",
      value: () => "",
      className: "w-[1%] whitespace-nowrap",
      cell: (l: SiteAuditLead) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {l.whatsapp ? (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={`https://wa.me/${l.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="واتساب"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => openDetails(l)} title="التفاصيل">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    });

    return cols;
  }, [visible, visitorCounts]);

  return (
    <LandingShell
      title="الطلبات"
      description="متابعو فحص النظام — مع المرحلة التي وصلوا إليها"
    >
      <DataTable
        rows={leads.data ?? []}
        columns={columns}
        searchPlaceholder="ابحث بالاسم أو الواتساب أو النشاط أو المرحلة…"
        emptyState="لا توجد طلبات بعد."
        onRowClick={openDetails}
        toolbar={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="h-4 w-4" />
                الأعمدة
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>عرض الأعمدة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COL_DEFS.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={visible[c.key]}
                  onCheckedChange={() => toggleCol(c.key)}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl">
          {selected ? (
            <>
              <div className="border-b border-border bg-muted/25 px-5 py-4">
                <DialogHeader className="gap-2 text-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-lg leading-snug">
                      {selected.name?.trim() || "زائر لم يُكمل الاسم"}
                    </DialogTitle>
                    <StatusBadge tone={toneFor(selected.status)}>
                      {SITE_AUDIT_LEAD_STATUS_LABELS[selected.status] ?? selected.status}
                    </StatusBadge>
                  </div>
                  <DialogDescription className="text-sm">
                    المرحلة:{" "}
                    <span className="font-medium text-foreground">
                      {selected.step_label || `خطوة ${selected.step_reached}`}
                    </span>
                    {selected.whatsapp ? (
                      <>
                        {" · "}
                        <span dir="ltr">{selected.whatsapp}</span>
                      </>
                    ) : null}
                    {isDuplicateLead(selected, visitorCounts) ? (
                      <>
                        {" · "}
                        <span className="font-medium text-amber-700">إدخال مكرر لنفس الزائر</span>
                      </>
                    ) : null}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto px-5 py-4">
                {selected.visitor_key ? (
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5 text-xs text-muted-foreground">
                    مفتاح الزائر:{" "}
                    <span className="font-mono text-[11px] text-foreground" dir="ltr">
                      {selected.visitor_key}
                    </span>
                  </div>
                ) : null}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DetailRow icon={Building2} label="نوع النشاط" value={selected.business_type} />
                  <DetailRow icon={Activity} label="حجم المعاملات" value={selected.monthly_volume} />
                  <DetailRow icon={Users} label="حجم الفريق" value={selected.team_size} />
                  <DetailRow
                    icon={AlertTriangle}
                    label="العوائق"
                    value={(selected.challenges ?? []).join(" · ")}
                  />
                </div>

                <div className="rounded-xl border border-border/70 bg-background px-3.5 py-3 text-xs text-muted-foreground">
                  تاريخ البدء:{" "}
                  <span className="font-medium text-foreground">
                    {formatDateTime(selected.created_at)}
                  </span>
                  {selected.updated_at ? (
                    <>
                      {" · "}آخر تحديث:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateTime(selected.updated_at)}
                      </span>
                    </>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <Select
                    value={selected.status}
                    onValueChange={(v) =>
                      updateStatus.mutate({
                        id: selected.id,
                        status: v as SiteAuditLeadStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">قيد التعبئة</SelectItem>
                      <SelectItem value="new">جديد</SelectItem>
                      <SelectItem value="contacted">تم التواصل</SelectItem>
                      <SelectItem value="qualified">مؤهل</SelectItem>
                      <SelectItem value="closed">مغلق</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="landing-notes">ملاحظات الفريق</Label>
                  <Textarea
                    id="landing-notes"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={3}
                    className="resize-none"
                    placeholder="ملاحظات المتابعة…"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={
                      saveNotes.isPending || notesDraft.trim() === (selected.notes ?? "").trim()
                    }
                    onClick={() => saveNotes.mutate({ id: selected.id, notes: notesDraft })}
                  >
                    حفظ الملاحظات
                  </Button>
                </div>
              </div>

              <DialogFooter className="gap-2 border-t border-border bg-muted/20 px-5 py-3 sm:justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteId(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void copySummary(selected)}
                  >
                    <Copy className="h-4 w-4" />
                    نسخ
                  </Button>
                  {selected.whatsapp ? (
                    <Button type="button" size="sm" asChild>
                      <a
                        href={`https://wa.me/${selected.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-4 w-4" />
                        واتساب
                      </a>
                    </Button>
                  ) : null}
                </div>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف الطلب"
        description="هل أنت متأكد من حذف هذا الطلب؟"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </LandingShell>
  );
}
