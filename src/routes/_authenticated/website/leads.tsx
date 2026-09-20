import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteDoc, doc, updateDoc } from "firebase/firestore";

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
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type { SiteLead, SiteLeadStatus } from "@/integrations/firebase/types";
import { withFirebaseError } from "@/integrations/firebase/helpers";
import { siteLeadsQuery } from "@/lib/data";
import { SITE_LEAD_STATUS_LABELS } from "@/lib/site-defaults";
import { formatDate } from "@/lib/samaa";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/website/leads")({
  head: () => ({
    meta: [
      { title: "طلبات التواصل — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteLeadsPage,
});

function toneFor(status: SiteLeadStatus) {
  if (status === "completed") return "success" as const;
  if (status === "in_progress") return "info" as const;
  return "warning" as const;
}

function WebsiteLeadsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const leads = useQuery({ ...siteLeadsQuery(), enabled });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SiteLeadStatus }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_leads", id), { status });
      }),
    onSuccess: async () => {
      toast.success("تم تحديث الحالة");
      await queryClient.invalidateQueries({ queryKey: ["site-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "site_leads", id));
      }),
    onSuccess: async () => {
      toast.success("تم الحذف");
      setDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["site-leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <WebsiteShell title="طلبات التواصل" description="الرسائل الواردة من نموذج الموقع العام">
      <DataTable
        rows={leads.data ?? []}
        searchPlaceholder="ابحث بالاسم أو البريد…"
        emptyState="لا توجد طلبات بعد."
        columns={[
          {
            key: "name",
            header: "الاسم",
            value: (l: SiteLead) => l.name,
            cell: (l: SiteLead) => (
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                  {l.email}
                  {l.phone ? ` · ${l.phone}` : ""}
                </div>
              </div>
            ),
          },
          {
            key: "service",
            header: "الخدمة",
            value: (l: SiteLead) => l.service_type,
            cell: (l: SiteLead) => l.service_type || "—",
          },
          {
            key: "details",
            header: "التفاصيل",
            value: (l: SiteLead) => l.project_details,
            cell: (l: SiteLead) => (
              <p className="max-w-sm line-clamp-2 text-sm text-muted-foreground">
                {l.project_details || "—"}
              </p>
            ),
          },
          {
            key: "status",
            header: "الحالة",
            value: (l: SiteLead) => l.status,
            cell: (l: SiteLead) => (
              <div className="flex flex-col gap-2">
                <StatusBadge tone={toneFor(l.status)}>
                  {SITE_LEAD_STATUS_LABELS[l.status] ?? l.status}
                </StatusBadge>
                <Select
                  value={l.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: l.id, status: v as SiteLeadStatus })
                  }
                >
                  <SelectTrigger className="h-8 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">جديد</SelectItem>
                    <SelectItem value="in_progress">قيد المتابعة</SelectItem>
                    <SelectItem value="completed">مكتمل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ),
          },
          {
            key: "date",
            header: "التاريخ",
            value: (l: SiteLead) => l.created_at,
            cell: (l: SiteLead) => (
              <span className="text-sm text-muted-foreground">{formatDate(l.created_at)}</span>
            ),
          },
          {
            key: "actions",
            header: "",
            value: () => "",
            cell: (l: SiteLead) => (
              <Button variant="ghost" size="sm" onClick={() => setDeleteId(l.id)}>
                حذف
              </Button>
            ),
          },
        ]}
      />

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف الطلب"
        description="هل أنت متأكد من حذف طلب التواصل هذا؟"
        onConfirm={() => deleteId && remove.mutate(deleteId)}
        pending={remove.isPending}
      />
    </WebsiteShell>
  );
}
