import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/DataTable";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { clientsQuery, projectsQuery, transactionsQuery, type Transaction } from "@/lib/data";
import { formatCurrency, formatDate, transactionCategories } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({
    meta: [
      { title: "الحسابات المالية — Samaa Dev" },
      { name: "description", content: "الإيرادات والمصروفات وصافي ربح وكالة Samaa Dev والدفعات غير المحصّلة." },
      { property: "og:title", content: "الحسابات المالية — Samaa Dev" },
      { property: "og:description", content: "تتبع الإيرادات والمصروفات والدفعات المستحقة." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { data: me, isFetched } = useCurrentUser();
  const { data: transactions = [] } = useQuery({
    ...transactionsQuery(),
    enabled: Boolean(me?.isStaff),
  });
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());

  if (isFetched && me && !me.isStaff) {
    return (
      <AppShell title="الحسابات المالية">
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          هذه الصفحة متاحة للمديرين فقط.
        </p>
      </AppShell>
    );
  }

  const income = transactions.filter((t) => t.kind === "income" && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const outstanding = transactions.filter((t) => t.kind === "income" && !t.is_paid).reduce((s, t) => s + Number(t.amount), 0);

  const label = (t: Transaction) =>
    projects.find((p) => p.id === t.project_id)?.name ??
    clients.find((c) => c.id === t.client_id)?.name ??
    "—";

  return (
    <AppShell title="الحسابات المالية" description="الإيرادات والمصروفات وصافي الربح" actions={<NewTransactionDialog />}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الإيرادات المحصّلة" value={formatCurrency(income)} icon={TrendingUp} tone="success" />
        <StatCard label="إجمالي المصروفات" value={formatCurrency(expenses)} icon={TrendingDown} tone="destructive" />
        <StatCard
          label="صافي الربح"
          value={formatCurrency(income - expenses)}
          icon={income - expenses >= 0 ? TrendingUp : TrendingDown}
          tone={income - expenses >= 0 ? "success" : "destructive"}
        />
        <StatCard label="دفعات غير محصّلة" value={formatCurrency(outstanding)} icon={Wallet} tone="warning" />
      </div>

      <div className="mt-6">
        <DataTable
          rows={transactions}
          searchPlaceholder="ابحث في الحركات المالية…"
          emptyState="لا توجد حركات مالية بعد."
          columns={[
            {
              key: "kind",
              header: "النوع",
              value: (t: Transaction) => t.kind,
              cell: (t: Transaction) => (
                <StatusBadge tone={t.kind === "income" ? "success" : "destructive"}>
                  {t.kind === "income" ? "إيراد" : "مصروف"}
                </StatusBadge>
              ),
            },
            {
              key: "title",
              header: "البيان",
              value: (t: Transaction) => t.description ?? "",
              cell: (t: Transaction) => <span className="font-medium">{t.description ?? ""}</span>,
            },
            { key: "category", header: "التصنيف", value: (t: Transaction) => t.category ?? "", cell: (t: Transaction) => t.category ?? "—" },
            { key: "ref", header: "المشروع / العميل", value: label, cell: label },
            {
              key: "amount",
              header: "المبلغ",
              value: (t: Transaction) => Number(t.amount),
              cell: (t: Transaction) => formatCurrency(Number(t.amount)),
            },
            {
              key: "paid",
              header: "الحالة",
              value: (t: Transaction) => (t.is_paid ? "مدفوع" : "معلق"),
              cell: (t: Transaction) => (
                <StatusBadge tone={t.is_paid ? "success" : "warning"}>{t.is_paid ? "مدفوع" : "معلق"}</StatusBadge>
              ),
            },
            {
              key: "date",
              header: "التاريخ",
              value: (t: Transaction) => t.occurred_on ?? "",
              cell: (t: Transaction) => formatDate(t.occurred_on),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}

function NewTransactionDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState({
    kind: "income" as "income" | "expense",
    title: "",
    category: "",
    amount: "",
    project_id: "",
    client_id: "",
    occurred_on: new Date().toISOString().slice(0, 10),
    is_paid: true,
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transactions").insert({
        kind: form.kind,
        description: [form.title.trim(), form.notes.trim()].filter(Boolean).join(" — "),
        category: form.category || null,
        amount: Number(form.amount || 0),
        project_id: form.project_id || null,
        client_id: form.client_id || null,
        ...(form.occurred_on ? { occurred_on: form.occurred_on } : {}),
        is_paid: form.is_paid,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم تسجيل الحركة المالية");
      setOpen(false);
      setForm({ ...form, title: "", amount: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />حركة مالية</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>حركة مالية جديدة</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>النوع</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v as "income" | "expense", category: "" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">إيراد</SelectItem>
                  <SelectItem value="expense">مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>التصنيف</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {transactionCategories[form.kind].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="f-title">البيان</Label>
            <Input id="f-title" maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="f-amount">المبلغ (د.ج)</Label>
              <Input id="f-amount" type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="f-date">التاريخ</Label>
              <Input id="f-date" type="date" value={form.occurred_on} onChange={(e) => setForm({ ...form, occurred_on: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>المشروع</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>العميل</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="f-paid">تم الدفع / التحصيل</Label>
            <Switch id="f-paid" checked={form.is_paid} onCheckedChange={(v) => setForm({ ...form, is_paid: v })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="f-notes">ملاحظات</Label>
            <Textarea id="f-notes" maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || !form.amount || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الحركة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
