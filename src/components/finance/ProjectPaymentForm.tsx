import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import type { PaymentMethod, PaymentStatus, Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { clientsQuery, milestonesQuery, projectsQuery } from "@/lib/data";
import { paymentMethodLabels, paymentStatusLabels } from "@/lib/samaa";

type FormState = {
  project_id: string;
  client_id: string;
  milestone_id: string;
  amount: string;
  tax_amount: string;
  invoice_number: string;
  payment_method: PaymentMethod | "";
  reference: string;
  payment_status: PaymentStatus;
  due_date: string;
  occurred_on: string;
  is_paid: boolean;
  notes: string;
};

const emptyForm = (defaults?: {
  project_id?: string;
  milestone_id?: string;
  amount?: number;
  client_id?: string;
}): FormState => ({
  project_id: defaults?.project_id ?? "",
  client_id: defaults?.client_id ?? "",
  milestone_id: defaults?.milestone_id ?? "",
  amount: defaults?.amount != null ? String(defaults.amount) : "",
  tax_amount: "",
  invoice_number: "",
  payment_method: "",
  reference: "",
  payment_status: "planned",
  due_date: "",
  occurred_on: new Date().toISOString().slice(0, 10),
  is_paid: false,
  notes: "",
});

export function ProjectPaymentForm({
  open,
  onOpenChange,
  editTx,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTx?: Transaction | null;
  defaults?: { project_id?: string; milestone_id?: string; amount?: number; client_id?: string };
}) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState<FormState>(() => emptyForm(defaults));

  const projectId = form.project_id || defaults?.project_id || "";
  const { data: milestones = [] } = useQuery({
    ...milestonesQuery(projectId || undefined),
    enabled: Boolean(projectId),
  });

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setForm({
        project_id: editTx.project_id ?? "",
        client_id: editTx.client_id ?? "",
        milestone_id: editTx.milestone_id ?? "",
        amount: String(editTx.amount ?? ""),
        tax_amount: editTx.tax_amount != null ? String(editTx.tax_amount) : "",
        invoice_number: editTx.invoice_number ?? "",
        payment_method: (editTx.payment_method as PaymentMethod) ?? "",
        reference: editTx.reference ?? "",
        payment_status: (editTx.payment_status as PaymentStatus) ?? "planned",
        due_date: editTx.due_date?.slice(0, 10) ?? "",
        occurred_on: editTx.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        is_paid: editTx.is_paid,
        notes: editTx.description ?? "",
      });
    } else {
      const project = projects.find((p) => p.id === defaults?.project_id);
      setForm(
        emptyForm({
          ...defaults,
          client_id: defaults?.client_id ?? project?.client_id ?? "",
        }),
      );
    }
  }, [open, editTx, defaults, projects]);

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const now = nowIso();
        const gross = Number(form.amount || 0);
        const tax = form.tax_amount ? Number(form.tax_amount) : 0;
        const net = Math.max(0, gross - tax);
        const payload = {
          kind: "income",
          tx_type: "project_payment" as const,
          category: "دفعة مشروع",
          description: form.notes.trim() || null,
          amount: net,
          tax_amount: tax || null,
          project_id: form.project_id || null,
          client_id: form.client_id || null,
          milestone_id: form.milestone_id || null,
          invoice_number: form.invoice_number.trim() || null,
          payment_method: form.payment_method || null,
          reference: form.reference.trim() || null,
          payment_status: form.is_paid ? ("paid" as const) : form.payment_status,
          due_date: form.due_date || null,
          occurred_on: form.occurred_on || now.slice(0, 10),
          is_paid: form.is_paid,
          updated_at: now,
        };

        if (editTx) {
          await updateDoc(doc(getDb(), "transactions", editTx.id), payload);
        } else {
          const id = newId();
          await setDoc(doc(getDb(), "transactions", id), {
            ...payload,
            created_by: getFirebaseAuth().currentUser?.uid ?? null,
            created_at: now,
          });
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success(editTx ? "تم تحديث الدفعة" : "تم تسجيل الدفعة");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editTx ? "تعديل دفعة مشروع" : "دفعة مشروع جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select
                value={form.project_id}
                onValueChange={(v) => {
                  const p = projects.find((x) => x.id === v);
                  setForm({
                    ...form,
                    project_id: v,
                    client_id: p?.client_id ?? form.client_id,
                    milestone_id: "",
                  });
                }}
              >
                <SelectTrigger><SelectValue placeholder="اختر المشروع" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>العميل</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>المرحلة (اختياري)</Label>
            <Select
              value={form.milestone_id || "__none__"}
              onValueChange={(v) => {
                if (v === "__none__") {
                  setForm({ ...form, milestone_id: "" });
                  return;
                }
                const m = milestones.find((x) => x.id === v);
                setForm({
                  ...form,
                  milestone_id: v,
                  amount: m?.amount ? String(m.amount) : form.amount,
                });
              }}
            >
              <SelectTrigger><SelectValue placeholder="بدون مرحلة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون مرحلة</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>المبلغ الإجمالي (د.ج)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>الضريبة (د.ج)</Label>
              <Input type="number" min={0} value={form.tax_amount} onChange={(e) => setForm({ ...form, tax_amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>رقم الفاتورة</Label>
              <Input value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>طريقة الدفع</Label>
              <Select
                value={form.payment_method || "__none__"}
                onValueChange={(v) => setForm({ ...form, payment_method: v === "__none__" ? "" : (v as PaymentMethod) })}
              >
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((k) => (
                    <SelectItem key={k} value={k}>{paymentMethodLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>المرجع البنكي</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>حالة التحصيل</Label>
              <Select
                value={form.payment_status}
                onValueChange={(v) => setForm({ ...form, payment_status: v as PaymentStatus })}
                disabled={form.is_paid}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(paymentStatusLabels) as PaymentStatus[]).filter((s) => s !== "paid" && s !== "overdue").map((k) => (
                    <SelectItem key={k} value={k}>{paymentStatusLabels[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>تاريخ الاستحقاق</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>تاريخ الحركة</Label>
              <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>تم التحصيل</Label>
            <Switch checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
          </div>
          <div className="grid gap-2">
            <Label>ملاحظات</Label>
            <Textarea value={form.notes} maxLength={1000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.project_id || !form.amount || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الدفعة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
