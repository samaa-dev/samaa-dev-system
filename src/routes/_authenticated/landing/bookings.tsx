import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { toast } from "sonner";
import { CalendarCheck, Inbox, MessageCircle, PhoneCall, Trophy } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, type Tone } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteBooking, SiteBookingStatus } from "@/integrations/firebase/types";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { siteBookingsQuery } from "@/lib/data";
import { SITE_BOOKING_STATUS_LABELS } from "@/lib/site-defaults";
import { formatDateTime } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/landing/bookings")({
  head: () => ({
    meta: [
      { title: "حجوزات الاستشارة — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingBookingsPage,
});

const STATUSES = Object.keys(SITE_BOOKING_STATUS_LABELS) as SiteBookingStatus[];

function toneFor(status: SiteBookingStatus): Tone {
  if (status === "won") return "success";
  if (status === "scheduled") return "primary";
  if (status === "contacted") return "info";
  if (status === "lost") return "muted";
  return "warning";
}

/** Local Algerian numbers (0XXXXXXXXX) → international for wa.me. */
function waNumber(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `213${digits.slice(1)}`;
  return digits;
}

function LandingBookingsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const bookings = useQuery({ ...siteBookingsQuery(), enabled });
  const [statusFilter, setStatusFilter] = useState<"all" | SiteBookingStatus>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notesFor, setNotesFor] = useState<SiteBooking | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const rows = bookings.data ?? [];
  const filtered = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter((b) => b.status === statusFilter)),
    [rows, statusFilter],
  );
  const count = (s: SiteBookingStatus) => rows.filter((b) => b.status === s).length;

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SiteBooking> }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_bookings", id), { ...patch, updated_at: nowIso() });
      }),
    onSuccess: async () => {
      toast.success("تم التحديث");
      await queryClient.invalidateQueries({ queryKey: ["site-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_bookings", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-bookings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <LandingShell
      title="حجوزات الاستشارة"
      description="الطلبات الواردة من نموذج الحجز في صفحة الإعلان (VSL)"
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="جديد" value={String(count("new"))} icon={Inbox} tone="warning" />
        <StatCard label="تم التواصل" value={String(count("contacted"))} icon={PhoneCall} tone="info" />
        <StatCard
          label="موعد محدد"
          value={String(count("scheduled"))}
          icon={CalendarCheck}
          tone="primary"
        />
        <StatCard label="تحوّل لعميل" value={String(count("won"))} icon={Trophy} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">تصفية:</span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({rows.length})</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SITE_BOOKING_STATUS_LABELS[s]} ({count(s)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        rows={filtered}
        searchPlaceholder="ابحث بالاسم أو الهاتف…"
        emptyState={bookings.isLoading ? "جاري التحميل…" : "لا توجد حجوزات بعد."}
        columns={[
          {
            key: "name",
            header: "العميل",
            value: (b: SiteBooking) => `${b.name} ${b.phone}`,
            cell: (b: SiteBooking) => (
              <div className="space-y-1">
                <div className="font-medium">{b.name}</div>
                <a
                  href={`tel:${b.phone}`}
                  className="block text-xs text-muted-foreground hover:text-foreground"
                  dir="ltr"
                >
                  {b.phone}
                </a>
              </div>
            ),
          },
          {
            key: "business",
            header: "النشاط",
            value: (b: SiteBooking) => `${b.business_type} ${b.daily_volume}`,
            cell: (b: SiteBooking) => (
              <div className="text-sm">
                <div>{b.business_type || "—"}</div>
                <div className="text-xs text-muted-foreground">{b.daily_volume || ""}</div>
              </div>
            ),
          },
          {
            key: "problem",
            header: "المشكلة",
            value: (b: SiteBooking) => `${b.problem} ${b.notes}`,
            cell: (b: SiteBooking) => (
              <div className="max-w-xs space-y-1">
                <p className="line-clamp-3 text-sm text-muted-foreground">{b.problem || "—"}</p>
                {b.notes ? (
                  <p className="line-clamp-2 rounded bg-muted px-2 py-1 text-xs">📝 {b.notes}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: "source",
            header: "المصدر",
            value: (b: SiteBooking) => `${b.utm?.source ?? ""} ${b.utm?.campaign ?? ""}`,
            cell: (b: SiteBooking) =>
              b.utm?.source || b.utm?.campaign ? (
                <div className="text-xs" dir="ltr">
                  <div className="font-medium">{b.utm?.source || "—"}</div>
                  <div className="text-muted-foreground">{b.utm?.campaign || ""}</div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">مباشر</span>
              ),
          },
          {
            key: "status",
            header: "الحالة",
            value: (b: SiteBooking) => b.status,
            cell: (b: SiteBooking) => (
              <div className="flex flex-col gap-2">
                <StatusBadge tone={toneFor(b.status)}>
                  {SITE_BOOKING_STATUS_LABELS[b.status] ?? b.status}
                </StatusBadge>
                <Select
                  value={b.status}
                  onValueChange={(v) =>
                    update.mutate({ id: b.id, patch: { status: v as SiteBookingStatus } })
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SITE_BOOKING_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ),
          },
          {
            key: "date",
            header: "التاريخ",
            value: (b: SiteBooking) => b.created_at,
            cell: (b: SiteBooking) => (
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(b.created_at)}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (b: SiteBooking) => (
              <div className="flex items-center gap-1">
                <Button asChild variant="ghost" size="icon" title="مراسلة على واتساب">
                  <a
                    href={`https://wa.me/${waNumber(b.phone)}?text=${encodeURIComponent(
                      `السلام عليكم ${b.name}، معك فريق Samaa Dev بخصوص طلب الاستشارة المجانية.`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      if (b.status === "new") update.mutate({ id: b.id, patch: { status: "contacted" } });
                    }}
                  >
                    <MessageCircle className="h-4 w-4 text-success" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotesFor(b);
                    setNotesDraft(b.notes ?? "");
                  }}
                >
                  ملاحظات
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(b.id)}>
                  حذف
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Dialog open={Boolean(notesFor)} onOpenChange={(o) => !o && setNotesFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ملاحظات — {notesFor?.name}</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="موعد الاستشارة، ما تم الاتفاق عليه، الخطوة التالية…"
          />
          <DialogFooter>
            <Button
              onClick={() => {
                if (!notesFor) return;
                update.mutate(
                  { id: notesFor.id, patch: { notes: notesDraft.trim() } },
                  { onSuccess: () => setNotesFor(null) },
                );
              }}
              disabled={update.isPending}
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف الحجز"
        description="هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </LandingShell>
  );
}
