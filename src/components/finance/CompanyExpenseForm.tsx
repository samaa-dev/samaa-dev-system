import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { transactionCategories } from "@/lib/samaa";

const companyExpenseCategories = transactionCategories.expense.filter(
  (c) => c !== "رواتب" && c !== "مكافأة" && c !== "خصم",
);

type FormState = {
  title: string;
  category: string;
  amount: string;
  vendor: string;
  occurred_on: string;
  is_paid: boolean;
  notes: string;
};

export function CompanyExpenseForm({
  open,
  onOpenChange,
  editTx,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTx?: Transaction | null;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    title: "",
    category: "",
    amount: "",
    vendor: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    is_paid: true,
    notes: "",
  });

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setForm({
        title: editTx.description?.split(" — ")[0] ?? "",
        category: editTx.category ?? "",
        amount: String(editTx.amount ?? ""),
        vendor: editTx.vendor ?? "",
        occurred_on: editTx.occurred_on?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        is_paid: editTx.is_paid,
        notes: editTx.description?.includes(" — ")
          ? editTx.description.split(" — ").slice(1).join(" — ")
          : "",
      });
    } else {
      setForm({
        title: "",
        category: "",
        amount: "",
        vendor: "",
        occurred_on: new Date().toISOString().slice(0, 10),
        is_paid: true,
        notes: "",
      });
    }
  }, [open, editTx]);

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const now = nowIso();
        const description =
          [form.title.trim(), form.notes.trim()].filter(Boolean).join(" — ") || null;
        const payload = {
          kind: "expense",
          tx_type: "company_expense" as const,
          expense_scope: "company" as const,
          category: form.category || null,
          description,
          amount: Number(form.amount || 0),
          vendor: form.vendor.trim() || null,
          occurred_on: form.occurred_on || now.slice(0, 10),
          due_date: null,
          is_paid: form.is_paid,
          project_id: null,
          client_id: null,
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
      toast.success(editTx ? "تم تحديث المصروف" : "تم تسجيل المصروف");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTx ? "تعديل مصروف شركة" : "مصروف شركة جديد"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>البيان</Label>
            <Input value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>التصنيف</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {companyExpenseCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>المبلغ (د.ج)</Label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>المورد / الجهة</Label>
              <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>التاريخ</Label>
              <Input type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label>تم الدفع</Label>
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
            disabled={!form.title.trim() || !form.amount || mutation.isPending}
          >
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ المصروف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
