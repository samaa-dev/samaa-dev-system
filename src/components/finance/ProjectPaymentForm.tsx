import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { doc, setDoc, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { PaymentMethod, Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { milestonesQuery, projectsQuery } from "@/lib/data";
import { paymentMethodLabels } from "@/lib/samaa";

type FormState = {
  project_id: string;
  client_id: string;
  milestone_id: string;
  amount: string;
  payment_method: PaymentMethod | "";
  occurred_on: string;
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
  payment_method: "",
  occurred_on: new Date().toISOString().slice(0, 10),
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
        payment_method: (editTx.payment_method as PaymentMethod) ?? "",
        occurred_on: editTx.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
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
        const amount = Number(form.amount || 0);
        const payload = {
          kind: "income",
          tx_type: "project_payment" as const,
          category: "دفعة مشروع",
          description: form.notes.trim() || null,
          amount,
          tax_amount: editTx?.tax_amount ?? null,
          project_id: form.project_id || null,
          client_id: form.client_id || null,
          milestone_id: form.milestone_id || null,
          invoice_number: editTx?.invoice_number ?? null,
          payment_method: form.payment_method || null,
          reference: editTx?.reference ?? null,
          payment_status: "paid" as const,
          due_date: editTx?.due_date ?? null,
          occurred_on: form.occurred_on || now.slice(0, 10),
          is_paid: true,
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTx ? "تعديل دفعة مشروع" : "دفعة مشروع جديدة"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>المشروع</Label>
            <Select
              value={form.project_id}
              onValueChange={(v) => {
                const p = projects.find((x) => x.id === v);
                setForm({
                  ...form,
                  project_id: v,
                  client_id: p?.client_id ?? "",
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
            <Label>المرحلة</Label>
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
              disabled={!form.project_id}
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

          <div className="grid gap-2">
            <Label>المبلغ الإجمالي (د.ج)</Label>
            <Input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>طريقة الدفع</Label>
            <Select
              value={form.payment_method || "__none__"}
              onValueChange={(v) =>
                setForm({ ...form, payment_method: v === "__none__" ? "" : (v as PaymentMethod) })
              }
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
            <Label>تاريخ الدفعة</Label>
            <Input
              type="date"
              value={form.occurred_on}
              onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
            />
          </div>

          <div className="grid gap-2">
            <Label>ملاحظة</Label>
            <Textarea
              value={form.notes}
              maxLength={1000}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
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
