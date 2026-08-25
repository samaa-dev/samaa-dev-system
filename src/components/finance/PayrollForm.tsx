import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import type { Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { payrollProfileQuery, teamQuery } from "@/lib/data";
import { computePayrollAmount, currentYearMonth, monthPeriodBounds } from "@/lib/finance";
import { formatCurrency } from "@/lib/samaa";

type FormState = {
  payee_id: string;
  year_month: string;
  base_amount: string;
  bonus: string;
  deductions: string;
  occurred_on: string;
  is_paid: boolean;
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
    base_amount: "",
    bonus: "",
    deductions: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    is_paid: true,
    notes: "",
  });

  const { data: payrollProfile } = useQuery({
    ...payrollProfileQuery(form.payee_id),
    enabled: Boolean(form.payee_id) && open,
  });

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      const start = editTx.period_start?.slice(0, 7) ?? currentYearMonth();
      setForm({
        payee_id: editTx.payee_id ?? "",
        year_month: start,
        base_amount: editTx.base_amount != null ? String(editTx.base_amount) : String(editTx.amount ?? ""),
        bonus: editTx.bonus != null ? String(editTx.bonus) : "",
        deductions: editTx.deductions != null ? String(editTx.deductions) : "",
        occurred_on: editTx.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        is_paid: editTx.is_paid,
        notes: editTx.description ?? "",
      });
    } else {
      setForm({
        payee_id: defaultPayeeId ?? "",
        year_month: currentYearMonth(),
        base_amount: "",
        bonus: "",
        deductions: "",
        occurred_on: new Date().toISOString().slice(0, 10),
        is_paid: true,
        notes: "",
      });
    }
  }, [open, editTx, defaultPayeeId]);

  const net = useMemo(
    () =>
      computePayrollAmount(
        form.base_amount ? Number(form.base_amount) : 0,
        form.bonus ? Number(form.bonus) : 0,
        form.deductions ? Number(form.deductions) : 0,
      ),
    [form.base_amount, form.bonus, form.deductions],
  );

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const now = nowIso();
        const { start, end } = monthPeriodBounds(form.year_month);
        const payload = {
          kind: "expense",
          tx_type: "payroll" as const,
          category: "رواتب",
          description: form.notes.trim() || null,
          amount: net,
          base_amount: form.base_amount ? Number(form.base_amount) : net,
          bonus: form.bonus ? Number(form.bonus) : 0,
          deductions: form.deductions ? Number(form.deductions) : 0,
          payee_id: form.payee_id,
          period_start: start,
          period_end: end,
          occurred_on: form.occurred_on || now.slice(0, 10),
          due_date: end,
          is_paid: form.is_paid,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTx ? "تعديل راتب" : "صرف راتب"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>الموظف</Label>
            <Select value={form.payee_id} onValueChange={(v) => setForm({ ...form, payee_id: v })}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {team.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name ?? "عضو"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>شهر الراتب</Label>
              <Input
                type="month"
                value={form.year_month}
                onChange={(e) => setForm({ ...form, year_month: e.target.value })}
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
          </div>
          {payrollProfile?.monthly_salary != null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, base_amount: String(payrollProfile.monthly_salary) })}
            >
              استخدام الراتب الأساسي ({formatCurrency(payrollProfile.monthly_salary)})
            </Button>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>الأساسي</Label>
              <Input type="number" min={0} value={form.base_amount} onChange={(e) => setForm({ ...form, base_amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>مكافأة</Label>
              <Input type="number" min={0} value={form.bonus} onChange={(e) => setForm({ ...form, bonus: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>خصومات</Label>
              <Input type="number" min={0} value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
            </div>
          </div>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
            الصافي: <span className="font-semibold text-primary">{formatCurrency(net)}</span>
          </p>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>تم الصرف</Label>
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
            disabled={!form.payee_id || !form.base_amount || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الراتب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
