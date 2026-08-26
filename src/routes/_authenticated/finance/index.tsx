import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { CompanyExpenseForm } from "@/components/finance/CompanyExpenseForm";
import { MonthlySummaryCards } from "@/components/finance/MonthlySummaryCards";
import { PayrollForm } from "@/components/finance/PayrollForm";
import { ProjectPaymentForm } from "@/components/finance/ProjectPaymentForm";
import { DataTable } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import type { Transaction } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { clientsQuery, projectsQuery, teamQuery, transactionsQuery } from "@/lib/data";
import {
  derivePaymentStatus,
  isCompanyExpenseTx,
  isPayrollTx,
  isProjectPaymentTx,
} from "@/lib/finance";
import {
  formatCurrency,
  formatDate,
  paymentMethodLabels,
  paymentStatusLabels,
  transactionCategories,
  txTypeLabels,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/finance/")({
  head: () => ({
    meta: [
      { title: "الحسابات المالية — Samaa Dev" },
      { name: "description", content: "الإيرادات والمصروفات والرواتب ودفعات المشاريع." },
      { property: "og:title", content: "الحسابات المالية — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { data: me, isFetched } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: transactions = [] } = useQuery({
    ...transactionsQuery(),
    enabled: Boolean(me?.isStaff),
  });
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: team = [] } = useQuery(teamQuery());

  const [tab, setTab] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<Transaction | null>(null);
  const [editPayroll, setEditPayroll] = useState<Transaction | null>(null);
  const [editExpense, setEditExpense] = useState<Transaction | null>(null);

  const outstandingByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.kind !== "income" || t.is_paid || !t.client_id) continue;
      map.set(t.client_id, (map.get(t.client_id) ?? 0) + Number(t.amount));
    }
    return [...map.entries()]
      .map(([clientId, amount]) => ({
        id: clientId,
        name: clients.find((c) => c.id === clientId)?.name ?? "—",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, clients]);

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "transactions", id));
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم حذف الحركة");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isFetched && me && !me.isStaff) {
    return (
      <AppShell title="الحسابات المالية">
        <p className="panel p-10 text-center text-sm text-muted-foreground">
          هذه الصفحة متاحة للمديرين فقط. يمكنك مراجعة راتبك من صفحة الفريق.
        </p>
      </AppShell>
    );
  }

  const income = transactions.filter((t) => t.kind === "income" && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const outstanding = transactions.filter((t) => t.kind === "income" && !t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const profitMargin = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

  const filteredAll = transactions.filter((t) => {
    if (kindFilter !== "all" && t.kind !== kindFilter) return false;
    if (projectFilter !== "all" && t.project_id !== projectFilter) return false;
    if (monthFilter !== "all" && !(t.occurred_on ?? "").startsWith(monthFilter)) return false;
    return true;
  });

  const payments = transactions.filter(isProjectPaymentTx);
  const payrolls = transactions.filter(isPayrollTx);
  const companyExpenses = transactions.filter(isCompanyExpenseTx);

  const projectName = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";
  const clientName = (id: string | null) => clients.find((c) => c.id === id)?.name ?? "—";
  const memberName = (id: string | null) => team.find((m) => m.id === id)?.full_name ?? "—";

  const label = (t: Transaction) =>
    projects.find((p) => p.id === t.project_id)?.name ??
    clients.find((c) => c.id === t.client_id)?.name ??
    (t.payee_id ? memberName(t.payee_id) : "—");

  const months = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      const ym = (t.occurred_on ?? "").slice(0, 7);
      if (ym) set.add(ym);
    }
    return [...set].sort().reverse();
  }, [transactions]);

  const payrollByMember = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of payrolls.filter((p) => p.is_paid)) {
      if (!t.payee_id) continue;
      map.set(t.payee_id, (map.get(t.payee_id) ?? 0) + Number(t.amount));
    }
    return [...map.entries()]
      .map(([id, amount]) => ({ id, name: memberName(id), amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [payrolls, team]);

  return (
    <AppShell title="الحسابات المالية" description="الإيرادات والمصروفات والرواتب ودفعات المشاريع">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="إجمالي الإيرادات المحصّلة" value={formatCurrency(income)} icon={TrendingUp} tone="success" />
        <StatCard label="إجمالي المصروفات" value={formatCurrency(expenses)} icon={TrendingDown} tone="destructive" />
        <StatCard
          label="صافي الربح"
          value={formatCurrency(income - expenses)}
          icon={income - expenses >= 0 ? TrendingUp : TrendingDown}
          tone={income - expenses >= 0 ? "success" : "destructive"}
        />
        <StatCard label="هامش الربح" value={`${profitMargin}%`} icon={TrendingUp} tone="success" />
        <StatCard label="دفعات غير محصّلة" value={formatCurrency(outstanding)} icon={Wallet} tone="warning" />
      </div>

      <div className="mt-6">
        <MonthlySummaryCards transactions={transactions} />
      </div>

      {outstandingByClient.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold">دفعات غير محصّلة حسب العميل</h2>
          <DataTable
            rows={outstandingByClient}
            searchPlaceholder="ابحث عن عميل…"
            emptyState="لا توجد دفعات معلّقة."
            columns={[
              {
                key: "name",
                header: "العميل",
                value: (r) => r.name,
                cell: (r) => <span className="font-medium">{r.name}</span>,
              },
              {
                key: "amount",
                header: "المبلغ غير المحصّل",
                value: (r) => r.amount,
                cell: (r) => formatCurrency(r.amount),
              },
            ]}
          />
        </div>
      ) : null}

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="payments">دفعات المشاريع</TabsTrigger>
            <TabsTrigger value="payroll">الرواتب</TabsTrigger>
            <TabsTrigger value="expenses">مصاريف الشركة</TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            {tab === "all" ? <NewTransactionDialog /> : null}
            {tab === "payments" ? (
              <Button size="sm" onClick={() => { setEditPayment(null); setPaymentOpen(true); }}>
                <Plus className="h-4 w-4" />دفعة مشروع
              </Button>
            ) : null}
            {tab === "payroll" ? (
              <Button size="sm" onClick={() => { setEditPayroll(null); setPayrollOpen(true); }}>
                <Plus className="h-4 w-4" />صرف راتب
              </Button>
            ) : null}
            {tab === "expenses" ? (
              <Button size="sm" onClick={() => { setEditExpense(null); setExpenseOpen(true); }}>
                <Plus className="h-4 w-4" />مصروف شركة
              </Button>
            ) : null}
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select value={kindFilter} onValueChange={setKindFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="income">إيراد</SelectItem>
                <SelectItem value="expense">مصروف</SelectItem>
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المشاريع</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأشهر</SelectItem>
                {months.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DataTable
            rows={filteredAll}
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
                key: "tx_type",
                header: "التصنيف الدقيق",
                value: (t: Transaction) => t.tx_type ?? "general",
                cell: (t: Transaction) =>
                  txTypeLabels[(t.tx_type ?? "general") as keyof typeof txTypeLabels] ?? "عام",
              },
              {
                key: "title",
                header: "البيان",
                value: (t: Transaction) => t.description ?? "",
                cell: (t: Transaction) => <span className="font-medium">{t.description ?? t.category ?? "—"}</span>,
              },
              { key: "category", header: "التصنيف", value: (t: Transaction) => t.category ?? "", cell: (t: Transaction) => t.category ?? "—" },
              { key: "ref", header: "المرجع", value: label, cell: label },
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
              {
                key: "actions",
                header: "",
                cell: (t: Transaction) => (
                  <RowActions
                    onEdit={() => {
                      if (isProjectPaymentTx(t)) {
                        setEditPayment(t);
                        setPaymentOpen(true);
                      } else if (isPayrollTx(t)) {
                        setEditPayroll(t);
                        setPayrollOpen(true);
                      } else if (isCompanyExpenseTx(t)) {
                        setEditExpense(t);
                        setExpenseOpen(true);
                      } else {
                        setEditTx(t);
                      }
                    }}
                    onDelete={me?.isAdmin ? () => setDeleteId(t.id) : undefined}
                    canDelete={Boolean(me?.isAdmin)}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="payments">
          <DataTable
            rows={payments}
            searchPlaceholder="ابحث في دفعات المشاريع…"
            emptyState="لا توجد دفعات مشاريع بعد."
            columns={[
              {
                key: "project",
                header: "المشروع",
                value: (t) => projectName(t.project_id),
                cell: (t) => <span className="font-medium">{projectName(t.project_id)}</span>,
              },
              {
                key: "client",
                header: "العميل",
                value: (t) => clientName(t.client_id),
                cell: (t) => clientName(t.client_id),
              },
              {
                key: "invoice",
                header: "الفاتورة",
                value: (t) => t.invoice_number ?? "",
                cell: (t) => t.invoice_number ?? "—",
              },
              {
                key: "method",
                header: "طريقة الدفع",
                value: (t) => t.payment_method ?? "",
                cell: (t) =>
                  t.payment_method
                    ? paymentMethodLabels[t.payment_method as keyof typeof paymentMethodLabels] ?? t.payment_method
                    : "—",
              },
              {
                key: "amount",
                header: "المبلغ",
                value: (t) => Number(t.amount),
                cell: (t) => formatCurrency(Number(t.amount)),
              },
              {
                key: "status",
                header: "الحالة",
                value: (t) => derivePaymentStatus(t),
                cell: (t) => {
                  const s = derivePaymentStatus(t);
                  return (
                    <StatusBadge tone={s === "paid" ? "success" : s === "overdue" ? "destructive" : "warning"}>
                      {paymentStatusLabels[s]}
                    </StatusBadge>
                  );
                },
              },
              {
                key: "date",
                header: "التاريخ",
                value: (t) => t.occurred_on ?? "",
                cell: (t) => formatDate(t.occurred_on),
              },
              {
                key: "actions",
                header: "",
                cell: (t) => (
                  <RowActions
                    onEdit={() => { setEditPayment(t); setPaymentOpen(true); }}
                    onDelete={me?.isAdmin ? () => setDeleteId(t.id) : undefined}
                    canDelete={Boolean(me?.isAdmin)}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          {payrollByMember.length > 0 ? (
            <DataTable
              rows={payrollByMember}
              searchPlaceholder="ابحث عن موظف…"
              emptyState=""
              columns={[
                {
                  key: "name",
                  header: "الموظف",
                  value: (r) => r.name,
                  cell: (r) => <span className="font-medium">{r.name}</span>,
                },
                {
                  key: "amount",
                  header: "إجمالي المدفوع",
                  value: (r) => r.amount,
                  cell: (r) => formatCurrency(r.amount),
                },
              ]}
            />
          ) : null}
          <DataTable
            rows={payrolls}
            searchPlaceholder="ابحث في الرواتب…"
            emptyState="لا توجد رواتب مسجّلة بعد."
            columns={[
              {
                key: "member",
                header: "الموظف",
                value: (t) => memberName(t.payee_id ?? null),
                cell: (t) => <span className="font-medium">{memberName(t.payee_id ?? null)}</span>,
              },
              {
                key: "period",
                header: "الفترة",
                value: (t) => t.period_start ?? "",
                cell: (t) =>
                  t.period_start
                    ? `${formatDate(t.period_start)} — ${formatDate(t.period_end)}`
                    : "—",
              },
              {
                key: "base",
                header: "الأساسي",
                value: (t) => Number(t.base_amount ?? t.amount),
                cell: (t) => formatCurrency(Number(t.base_amount ?? t.amount)),
              },
              {
                key: "net",
                header: "الصافي",
                value: (t) => Number(t.amount),
                cell: (t) => formatCurrency(Number(t.amount)),
              },
              {
                key: "paid",
                header: "الحالة",
                value: (t) => (t.is_paid ? "مصروف" : "معلق"),
                cell: (t) => (
                  <StatusBadge tone={t.is_paid ? "success" : "warning"}>
                    {t.is_paid ? "تم الصرف" : "معلق"}
                  </StatusBadge>
                ),
              },
              {
                key: "date",
                header: "تاريخ الصرف",
                value: (t) => t.occurred_on ?? "",
                cell: (t) => formatDate(t.occurred_on),
              },
              {
                key: "actions",
                header: "",
                cell: (t) => (
                  <RowActions
                    onEdit={() => { setEditPayroll(t); setPayrollOpen(true); }}
                    onDelete={me?.isAdmin ? () => setDeleteId(t.id) : undefined}
                    canDelete={Boolean(me?.isAdmin)}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="expenses">
          <DataTable
            rows={companyExpenses}
            searchPlaceholder="ابحث في مصاريف الشركة…"
            emptyState="لا توجد مصاريف شركة بعد."
            columns={[
              {
                key: "title",
                header: "البيان",
                value: (t) => t.description ?? "",
                cell: (t) => <span className="font-medium">{t.description ?? "—"}</span>,
              },
              {
                key: "category",
                header: "التصنيف",
                value: (t) => t.category ?? "",
                cell: (t) => t.category ?? "—",
              },
              {
                key: "vendor",
                header: "المورد",
                value: (t) => t.vendor ?? "",
                cell: (t) => t.vendor ?? "—",
              },
              {
                key: "amount",
                header: "المبلغ",
                value: (t) => Number(t.amount),
                cell: (t) => formatCurrency(Number(t.amount)),
              },
              {
                key: "paid",
                header: "الحالة",
                value: (t) => (t.is_paid ? "مدفوع" : "معلق"),
                cell: (t) => (
                  <StatusBadge tone={t.is_paid ? "success" : "warning"}>
                    {t.is_paid ? "مدفوع" : "معلق"}
                  </StatusBadge>
                ),
              },
              {
                key: "date",
                header: "التاريخ",
                value: (t) => t.occurred_on ?? "",
                cell: (t) => formatDate(t.occurred_on),
              },
              {
                key: "actions",
                header: "",
                cell: (t) => (
                  <RowActions
                    onEdit={() => { setEditExpense(t); setExpenseOpen(true); }}
                    onDelete={me?.isAdmin ? () => setDeleteId(t.id) : undefined}
                    canDelete={Boolean(me?.isAdmin)}
                  />
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      {editTx ? (
        <EditTransactionDialog tx={editTx} open onOpenChange={(o) => !o && setEditTx(null)} />
      ) : null}

      <ProjectPaymentForm
        open={paymentOpen}
        onOpenChange={(o) => { setPaymentOpen(o); if (!o) setEditPayment(null); }}
        editTx={editPayment}
      />
      <PayrollForm
        open={payrollOpen}
        onOpenChange={(o) => { setPayrollOpen(o); if (!o) setEditPayroll(null); }}
        editTx={editPayroll}
      />
      <CompanyExpenseForm
        open={expenseOpen}
        onOpenChange={(o) => { setExpenseOpen(o); if (!o) setEditExpense(null); }}
        editTx={editExpense}
      />

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف الحركة المالية"
        description="سيتم حذف الحركة نهائياً."
        pending={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </AppShell>
  );
}

type TxForm = {
  kind: "income" | "expense";
  title: string;
  category: string;
  amount: string;
  project_id: string;
  client_id: string;
  occurred_on: string;
  is_paid: boolean;
  notes: string;
};

function TransactionFormFields({
  form,
  setForm,
  projects,
  clients,
}: {
  form: TxForm;
  setForm: (f: TxForm) => void;
  projects: { id: string; name: string }[];
  clients: { id: string; name: string }[];
}) {
  return (
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
          <Select value={form.project_id || "__none__"} onValueChange={(v) => setForm({ ...form, project_id: v === "__none__" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">بدون</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>العميل</Label>
          <Select value={form.client_id || "__none__"} onValueChange={(v) => setForm({ ...form, client_id: v === "__none__" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">بدون</SelectItem>
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
  );
}

function parseTxDescription(desc: string | null) {
  if (!desc) return { title: "", notes: "" };
  const parts = desc.split(" — ");
  if (parts.length > 1) return { title: parts[0] ?? "", notes: parts.slice(1).join(" — ") };
  return { title: desc, notes: "" };
}

function inferTxType(kind: "income" | "expense", category: string, project_id: string): string {
  if (kind === "income" && (category === "دفعة مشروع" || project_id)) return "project_payment";
  if (kind === "expense" && category === "رواتب") return "payroll";
  if (kind === "expense" && !project_id) return "company_expense";
  return "general";
}

function NewTransactionDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const [form, setForm] = useState<TxForm>({
    kind: "income",
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
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        const tx_type = inferTxType(form.kind, form.category, form.project_id);
        await setDoc(doc(getDb(), "transactions", id), {
          kind: form.kind,
          tx_type,
          description: [form.title.trim(), form.notes.trim()].filter(Boolean).join(" — ") || null,
          category: form.category || null,
          amount: Number(form.amount || 0),
          project_id: form.project_id || null,
          client_id: form.client_id || null,
          occurred_on: form.occurred_on || now.slice(0, 10),
          due_date: null,
          is_paid: form.is_paid,
          expense_scope: form.kind === "expense" ? (form.project_id ? "project" : "company") : null,
          created_by: getFirebaseAuth().currentUser?.uid ?? null,
          created_at: now,
          updated_at: now,
        });
      }),
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
        <Button size="sm" variant="outline"><Plus className="h-4 w-4" />حركة عامة</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>حركة مالية عامة</DialogTitle></DialogHeader>
        <TransactionFormFields form={form} setForm={setForm} projects={projects} clients={clients} />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || !form.amount || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ الحركة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTransactionDialog({
  tx,
  open,
  onOpenChange,
}: {
  tx: Transaction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: clients = [] } = useQuery(clientsQuery());
  const parsed = parseTxDescription(tx.description);
  const [form, setForm] = useState<TxForm>({
    kind: tx.kind as "income" | "expense",
    title: parsed.title,
    category: tx.category ?? "",
    amount: String(tx.amount),
    project_id: tx.project_id ?? "",
    client_id: tx.client_id ?? "",
    occurred_on: tx.occurred_on?.slice(0, 10) ?? "",
    is_paid: tx.is_paid,
    notes: parsed.notes,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "transactions", tx.id), {
          kind: form.kind,
          tx_type: inferTxType(form.kind, form.category, form.project_id),
          description: [form.title.trim(), form.notes.trim()].filter(Boolean).join(" — ") || null,
          category: form.category || null,
          amount: Number(form.amount || 0),
          project_id: form.project_id || null,
          client_id: form.client_id || null,
          occurred_on: form.occurred_on,
          is_paid: form.is_paid,
          expense_scope: form.kind === "expense" ? (form.project_id ? "project" : "company") : null,
          updated_at: nowIso(),
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("تم تحديث الحركة");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>تعديل الحركة المالية</DialogTitle></DialogHeader>
        <TransactionFormFields form={form} setForm={setForm} projects={projects} clients={clients} />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.title.trim() || !form.amount || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
