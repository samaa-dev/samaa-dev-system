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
import type { Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { payrollProfileQuery, teamQuery } from "@/lib/data";
import { currentYearMonth, monthPeriodBounds } from "@/lib/finance";

type FormState = {
  payee_id: string;
  year_month: string;
  amount: string;
  occurred_on: string;
  notes: string;
};

export function PayrollForm({
  open,
  onOpenChange,
  editTx,
  defaultPayeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTx?: Transaction | null;
  defaultPayeeId?: string;
}) {
  const queryClient = useQueryClient();
  const { data: team = [] } = useQuery(teamQuery());
  const [form, setForm] = useState<FormState>({
    payee_id: defaultPayeeId ?? "",
    year_month: currentYearMonth(),
    amount: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const { data: payrollProfile } = useQuery({
    ...payrollProfileQuery(form.payee_id),
    enabled: Boolean(form.payee_id) && open && !editTx,
  });

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      const start = editTx.period_start?.slice(0, 7) ?? currentYearMonth();
      setForm({
        payee_id: editTx.payee_id ?? "",
        year_month: start,
        amount: String(editTx.amount ?? editTx.base_amount ?? ""),
        occurred_on: editTx.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        notes: editTx.description ?? "",
      });
    } else {
      setForm({
        payee_id: defaultPayeeId ?? "",
        year_month: currentYearMonth(),
        amount: "",
        occurred_on: new Date().toISOString().slice(0, 10),
        notes: "",
      });
    }
  }, [open, editTx, defaultPayeeId]);

  useEffect(() => {
    if (!open || editTx || !form.payee_id) return;
    if (payrollProfile?.monthly_salary != null && !form.amount) {
      setForm((prev) => ({ ...prev, amount: String(payrollProfile.monthly_salary) }));
    }
  }, [open, editTx, form.payee_id, payrollProfile?.monthly_salary, form.amount]);

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const now = nowIso();
        const { start, end } = monthPeriodBounds(form.year_month);
        const amount = Number(form.amount || 0);
        const payload = {
          kind: "expense",
          tx_type: "payroll" as const,
          category: "رواتب",
          description: form.notes.trim() || null,
          amount,
          base_amount: amount,
          bonus: 0,
          deductions: 0,
          payee_id: form.payee_id,
          period_start: start,
          period_end: end,
          occurred_on: form.occurred_on || now.slice(0, 10),
          due_date: end,
          is_paid: true,
          project_id: null,
          client_id: null,
          expense_scope: "company" as const,
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
      toast.success(editTx ? "تم تحديث الراتب" : "تم تسجيل الراتب");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTx ? "تعديل راتب" : "صرف راتب"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>الموظف</Label>
            <Select
              value={form.payee_id}
              onValueChange={(v) => setForm({ ...form, payee_id: v, amount: "" })}
            >
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name ?? "عضو"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>شهر الراتب</Label>
            <Input
              type="month"
              value={form.year_month}
              onChange={(e) => setForm({ ...form, year_month: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>المبلغ (د.ج)</Label>
            <Input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>تاريخ الصرف</Label>
            <Input
              type="date"
              value={form.occurred_on}
              onChange={(e) => setForm({ ...form, occurred_on: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>ملاحظة</Label>
            <Textarea value={form.notes} maxLength={1000} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.payee_id || !form.amount || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الراتب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
