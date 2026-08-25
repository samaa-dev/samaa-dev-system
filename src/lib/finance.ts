import type { Milestone, PaymentStatus, Transaction } from "@/integrations/firebase/types";

export function isPayrollTx(tx: Transaction): boolean {
  return tx.tx_type === "payroll" || (tx.kind === "expense" && tx.category === "رواتب" && Boolean(tx.payee_id));
}

export function isProjectPaymentTx(tx: Transaction): boolean {
  return (
    tx.tx_type === "project_payment" ||
    (tx.kind === "income" && Boolean(tx.project_id) && (tx.category === "دفعة مشروع" || !tx.tx_type))
  );
}

export function isCompanyExpenseTx(tx: Transaction): boolean {
  return (
    tx.tx_type === "company_expense" ||
    (tx.kind === "expense" &&
      tx.expense_scope === "company" &&
      !isPayrollTx(tx) &&
      !tx.project_id)
  );
}

export function computePayrollAmount(
  base: number | null | undefined,
  bonus: number | null | undefined,
  deductions: number | null | undefined,
): number {
  return Math.max(0, Number(base ?? 0) + Number(bonus ?? 0) - Number(deductions ?? 0));
}

export function derivePaymentStatus(tx: Pick<Transaction, "is_paid" | "due_date" | "payment_status">): PaymentStatus {
  if (tx.is_paid) return "paid";
  if (tx.due_date) {
    const due = new Date(tx.due_date).getTime();
    if (!Number.isNaN(due) && due < Date.now()) return "overdue";
  }
  if (tx.payment_status === "invoiced" || tx.payment_status === "planned") return tx.payment_status;
  return tx.due_date ? "invoiced" : "planned";
}

export function projectFinancialSummary(
  projectId: string,
  budget: number,
  _milestones: Milestone[],
  txs: Transaction[],
) {
  const projectTxs = txs.filter((t) => t.project_id === projectId);
  const payments = projectTxs.filter(isProjectPaymentTx);
  const collected = payments.filter((t) => t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const outstanding = payments.filter((t) => !t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = projectTxs
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const remaining = Number(budget) - collected;

  return {
    budget: Number(budget),
    collected,
    outstanding,
    remaining,
    expenses,
    payments,
  };
}

export function payrollHistoryForUser(txs: Transaction[], userId: string) {
  return txs
    .filter((t) => isPayrollTx(t) && t.payee_id === userId)
    .sort((a, b) => String(b.occurred_on).localeCompare(String(a.occurred_on)));
}

export function monthlyTotals(txs: Transaction[], yearMonth: string) {
  const inMonth = txs.filter((t) => (t.occurred_on ?? "").startsWith(yearMonth));
  const income = inMonth
    .filter((t) => t.kind === "income" && t.is_paid)
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = inMonth.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const payroll = inMonth
    .filter((t) => isPayrollTx(t) && t.is_paid)
    .reduce((s, t) => s + Number(t.amount), 0);
  const companyExpenses = inMonth
    .filter((t) => isCompanyExpenseTx(t))
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    income,
    expenses,
    payroll,
    companyExpenses,
    net: income - expenses,
  };
}

export function currentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** First and last day of a YYYY-MM period. */
export function monthPeriodBounds(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y!, m!, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
