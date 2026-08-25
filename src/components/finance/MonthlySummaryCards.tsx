import { StatCard } from "@/components/StatCard";
import { currentYearMonth, monthlyTotals } from "@/lib/finance";
import { formatCurrency } from "@/lib/samaa";
import type { Transaction } from "@/integrations/firebase/types";
import { TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";

export function MonthlySummaryCards({ transactions }: { transactions: Transaction[] }) {
  const ym = currentYearMonth();
  const totals = monthlyTotals(transactions, ym);
  const [y, m] = ym.split("-");
  const monthLabel = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("ar-EG", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">ملخص {monthLabel}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="إيرادات الشهر" value={formatCurrency(totals.income)} icon={TrendingUp} tone="success" />
        <StatCard label="مصروفات الشهر" value={formatCurrency(totals.expenses)} icon={TrendingDown} tone="destructive" />
        <StatCard label="رواتب الشهر" value={formatCurrency(totals.payroll)} icon={Users} tone="info" />
        <StatCard label="مصاريف الشركة" value={formatCurrency(totals.companyExpenses)} icon={Wallet} tone="warning" />
        <StatCard
          label="صافي الشهر"
          value={formatCurrency(totals.net)}
          icon={totals.net >= 0 ? TrendingUp : TrendingDown}
          tone={totals.net >= 0 ? "success" : "destructive"}
        />
      </div>
    </div>
  );
}
