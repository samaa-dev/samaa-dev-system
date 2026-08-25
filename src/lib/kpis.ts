import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  FolderKanban,
  Timer,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import type {
  Client,
  KpiFormat,
  KpiSettings,
  KpiWidgetConfig,
  Project,
  Sprint,
  Task,
  Transaction,
} from "@/integrations/firebase/types";
import type { CurrentUser } from "@/hooks/use-auth";
import { currentYearMonth, isCompanyExpenseTx, isPayrollTx, isProjectPaymentTx } from "@/lib/finance";
import { daysLeft, formatCurrency, sprintUiLabels } from "@/lib/samaa";

export type { KpiFormat, KpiSettings, KpiWidgetConfig } from "@/integrations/firebase/types";

export type KpiCatalogItem = {
  id: string;
  defaultLabel: string;
  defaultFormat: KpiFormat;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "destructive" | "info";
  staffOnly?: boolean;
  adminOnly?: boolean;
  supportsTarget?: boolean;
  manualOnly?: boolean;
};

export const KPI_CATALOG: KpiCatalogItem[] = [
  { id: "active_projects", defaultLabel: "مشاريع نشطة", defaultFormat: "number", icon: FolderKanban, tone: "primary", supportsTarget: true },
  { id: "my_open_tasks", defaultLabel: "مهامي المفتوحة", defaultFormat: "number", icon: Activity, tone: "info" },
  { id: "team_done_tasks", defaultLabel: "مهام مكتملة (الفريق)", defaultFormat: "number", icon: Activity, tone: "success", supportsTarget: true },
  { id: "net_profit", defaultLabel: "صافي الربح", defaultFormat: "currency", icon: TrendingUp, tone: "success", staffOnly: true, supportsTarget: true },
  { id: "profit_margin", defaultLabel: "هامش الربح", defaultFormat: "percent", icon: TrendingUp, tone: "success", staffOnly: true, supportsTarget: true },
  { id: "outstanding", defaultLabel: "دفعات غير محصّلة", defaultFormat: "currency", icon: Wallet, tone: "warning", staffOnly: true, supportsTarget: true },
  { id: "payroll_month", defaultLabel: "رواتب الشهر", defaultFormat: "currency", icon: Users, tone: "info", staffOnly: true, supportsTarget: true },
  { id: "company_expenses_month", defaultLabel: "مصاريف الشركة (الشهر)", defaultFormat: "currency", icon: Wallet, tone: "warning", staffOnly: true, supportsTarget: true },
  { id: "project_collected", defaultLabel: "محصّل من المشاريع", defaultFormat: "currency", icon: TrendingUp, tone: "success", staffOnly: true, supportsTarget: true },
  { id: "active_cycles", defaultLabel: sprintUiLabels.active, defaultFormat: "number", icon: Timer, tone: "info" },
  { id: "late_projects", defaultLabel: "مشاريع متأخرة", defaultFormat: "number", icon: AlertTriangle, tone: "destructive", supportsTarget: true },
  { id: "avg_task_completion_days", defaultLabel: "متوسط إنجاز المهمة (يوم)", defaultFormat: "number", icon: Activity, tone: "info", supportsTarget: true },
  { id: "client_count", defaultLabel: "عدد العملاء", defaultFormat: "number", icon: Wallet, tone: "success" },
  { id: "custom_1", defaultLabel: "مؤشر مخصص 1", defaultFormat: "number", icon: Activity, tone: "primary", manualOnly: true },
  { id: "custom_2", defaultLabel: "مؤشر مخصص 2", defaultFormat: "number", icon: Activity, tone: "info", manualOnly: true },
];

export function defaultKpiSettings(): KpiSettings {
  return {
    updated_at: new Date().toISOString(),
    updated_by: null,
    widgets: KPI_CATALOG.map((item, i) => ({
      id: item.id,
      enabled: !item.manualOnly && !item.adminOnly,
      order: i,
      format: item.defaultFormat,
      show_target_bar: Boolean(item.supportsTarget),
    })),
  };
}

export type KpiContext = {
  me: CurrentUser | null | undefined;
  projects: Project[];
  tasks: Task[];
  sprints: Sprint[];
  clients: Client[];
  transactions: Transaction[];
};

function avgCompletionDays(tasks: Task[]): number {
  const done = tasks.filter((t) => t.status === "done" && t.completed_at && t.created_at);
  if (!done.length) return 0;
  const total = done.reduce((s, t) => {
    const ms = new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime();
    return s + ms / 86_400_000;
  }, 0);
  return Math.round(total / done.length);
}

export function computeAutoKpiValue(id: string, ctx: KpiContext): number {
  const income = ctx.transactions.filter((t) => t.kind === "income" && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = ctx.transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const ym = currentYearMonth();

  switch (id) {
    case "active_projects":
      return ctx.projects.filter((p) => ["active", "in_review"].includes(p.status)).length;
    case "my_open_tasks":
      return ctx.tasks.filter((t) => t.assignee_id === ctx.me?.id && t.status !== "done").length;
    case "team_done_tasks":
      return ctx.tasks.filter((t) => t.status === "done").length;
    case "net_profit":
      return income - expenses;
    case "profit_margin":
      return income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    case "outstanding":
      return ctx.transactions.filter((t) => t.kind === "income" && !t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
    case "payroll_month":
      return ctx.transactions
        .filter((t) => isPayrollTx(t) && t.is_paid && (t.occurred_on ?? "").startsWith(ym))
        .reduce((s, t) => s + Number(t.amount), 0);
    case "company_expenses_month":
      return ctx.transactions
        .filter((t) => isCompanyExpenseTx(t) && (t.occurred_on ?? "").startsWith(ym))
        .reduce((s, t) => s + Number(t.amount), 0);
    case "project_collected":
      return ctx.transactions
        .filter((t) => isProjectPaymentTx(t) && t.is_paid)
        .reduce((s, t) => s + Number(t.amount), 0);
    case "active_cycles":
      return ctx.sprints.filter((s) => s.status === "active").length;
    case "late_projects":
      return ctx.projects.filter((p) => p.status !== "completed" && (daysLeft(p.deadline) ?? 99) < 0).length;
    case "avg_task_completion_days":
      return avgCompletionDays(ctx.tasks);
    case "client_count":
      return ctx.clients.length;
    default:
      return 0;
  }
}

export function formatKpiValue(value: number, format: KpiFormat): string {
  if (format === "currency") return formatCurrency(value);
  if (format === "percent") return `${value}%`;
  return String(value);
}

export function resolveKpiDisplay(
  widget: KpiWidgetConfig,
  catalog: KpiCatalogItem,
  ctx: KpiContext,
): { value: number; display: string; hint?: string; tone: KpiCatalogItem["tone"] } {
  const format = widget.format ?? catalog.defaultFormat;
  const auto = computeAutoKpiValue(widget.id, ctx);
  const value = widget.manual_value != null && catalog.manualOnly ? widget.manual_value : widget.manual_value ?? auto;

  let tone = catalog.tone;
  if (widget.id === "net_profit") tone = value >= 0 ? "success" : "destructive";
  if (widget.id === "late_projects" && value > 0) tone = "destructive";

  let hint: string | undefined;
  if (widget.id === "my_open_tasks") {
    hint = `${ctx.tasks.filter((t) => t.status === "done").length} مهمة مكتملة للفريق`;
  }
  if (widget.id === "net_profit" && ctx.me?.isStaff) {
    const income = ctx.transactions.filter((t) => t.kind === "income" && t.is_paid).reduce((s, t) => s + Number(t.amount), 0);
    hint = `إيرادات ${formatCurrency(income)}`;
  }
  if (widget.id === "outstanding" && ctx.me?.isStaff) {
    hint = `${ctx.clients.length} عميل`;
  }

  return { value, display: formatKpiValue(value, format), hint, tone };
}

export function targetProgress(value: number, target: number | null | undefined): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.round((value / target) * 100));
}

export function mergeKpiSettings(saved: KpiSettings | null | undefined): KpiWidgetConfig[] {
  const defaults = defaultKpiSettings().widgets;
  if (!saved?.widgets?.length) return defaults;

  const byId = new Map(saved.widgets.map((w) => [w.id, w]));
  return KPI_CATALOG.map((item, i) => {
    const existing = byId.get(item.id);
    return existing
      ? { ...existing, format: existing.format ?? item.defaultFormat, order: existing.order ?? i }
      : defaults[i]!;
  }).sort((a, b) => a.order - b.order);
}
