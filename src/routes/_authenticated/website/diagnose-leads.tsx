import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useState } from "react";

import { WebsiteShell } from "@/components/website/WebsiteShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type {
  SiteDiagnosticLead,
  SiteDiagnosticLeadStatus,
} from "@/integrations/firebase/types";
import { withFirebaseError } from "@/integrations/firebase/helpers";
import { siteDiagnosticLeadsQuery } from "@/lib/data";
import { SITE_DIAGNOSTIC_LEAD_STATUS_LABELS } from "@/lib/site-defaults";
import { formatDate } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/website/diagnose-leads")({
  head: () => ({
    meta: [
      { title: "طلبات التشخيص — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteDiagnoseLeadsPage,
});

function toneFor(status: SiteDiagnosticLeadStatus) {
  if (status === "closed") return "muted" as const;
  if (status === "qualified") return "success" as const;
  if (status === "contacted") return "info" as const;
  return "warning" as const;
}

function WebsiteDiagnoseLeadsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const leads = useQuery({ ...siteDiagnosticLeadsQuery(), enabled });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SiteDiagnosticLead | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SiteDiagnosticLeadStatus }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_diagnostic_leads", id), { status });
      }),
    onSuccess: async () => {
      toast.success("تم تحديث الحالة");
      await queryClient.invalidateQueries({ queryKey: ["site-diagnostic-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_diagnostic_leads", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-diagnostic-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <WebsiteShell title="طلبات التشخيص" description="إجابات القمع التشخيصي مع لقطة الأسئلة وقت الإرسال">
      <DataTable
        rows={leads.data ?? []}
        searchPlaceholder="ابحث بالاسم أو الشركة…"
        emptyState="لا توجد طلبات تشخيص بعد."
        columns={[
          {
            key: "name",
            header: "الاسم",
            value: (l: SiteDiagnosticLead) => l.name,
            cell: (l: SiteDiagnosticLead) => (
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.company || "—"}</div>
              </div>
            ),
          },
          {
            key: "contact",
            header: "التواصل",
            value: (l: SiteDiagnosticLead) => `${l.phone} ${l.email}`,
            cell: (l: SiteDiagnosticLead) => (
              <div className="text-sm" dir="ltr">
                <div>{l.phone || "—"}</div>
                <div className="text-xs text-muted-foreground">{l.email || "—"}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: "الحالة",
            value: (l: SiteDiagnosticLead) => l.status,
            cell: (l: SiteDiagnosticLead) => (
              <div className="flex flex-col gap-2">
                <StatusBadge tone={toneFor(l.status)}>
                  {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS[l.status] ?? l.status}
                </StatusBadge>
                <Select
                  value={l.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: l.id, status: v as SiteDiagnosticLeadStatus })
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SITE_DIAGNOSTIC_LEAD_STATUS_LABELS) as SiteDiagnosticLeadStatus[]).map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS[s]}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            ),
          },
          {
            key: "created",
            header: "التاريخ",
            value: (l: SiteDiagnosticLead) => l.created_at,
            cell: (l: SiteDiagnosticLead) => formatDate(l.created_at),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (l: SiteDiagnosticLead) => (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setDetail(l)}>
                  التفاصيل
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setDeleteId(l.id)}>
                  حذف
                </Button>
              </div>
            ),
          },
        ]}
      />

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف طلب التشخيص"
        description="سيتم حذف هذا الطلب نهائياً. لا يمكن التراجع."
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>لقطة الإجابات — {detail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {(detail?.answers_snapshot ?? []).map((a, i) => (
              <div key={`${a.question_id}-${i}`} className="rounded-md border border-border p-3">
                <div className="font-medium text-foreground">{a.question_text}</div>
                <div className="mt-1 text-muted-foreground whitespace-pre-wrap">{a.answer || "—"}</div>
              </div>
            ))}
            {!detail?.answers_snapshot?.length ? (
              <p className="text-muted-foreground">لا توجد إجابات محفوظة.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </WebsiteShell>
  );
}
