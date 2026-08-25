// Shared domain constants, Arabic labels and formatters for the Samaa Dev system.

export type ProjectStatus = "planning" | "active" | "in_review" | "completed" | "on_hold";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type Priority = "high" | "medium" | "low";
export type SprintStatus = "planned" | "active" | "completed";

export const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: "تخطيط",
  active: "قيد التنفيذ",
  in_review: "مراجعة",
  completed: "مكتمل",
  on_hold: "متوقف مؤقتاً",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  backlog: "قائمة الانتظار",
  todo: "للتنفيذ",
  in_progress: "قيد العمل",
  review: "مراجعة الكود / الجودة",
  done: "مكتمل",
};

export const boardColumns: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export const priorityLabels: Record<Priority, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

export const sprintStatusLabels: Record<SprintStatus, string> = {
  planned: "مخطط",
  active: "نشط",
  completed: "منتهي",
};

/** Arabic UI labels for sprints (shown as «الدورات» in the product). */
export const sprintUiLabels = {
  module: "الدورات",
  singular: "دورة",
  singularDefinite: "الدورة",
  new: "دورة جديدة",
  name: "اسم الدورة",
  goal: "هدف الدورة",
  save: "حفظ الدورة",
  created: "تم إنشاء الدورة",
  active: "دورات نشطة",
  empty: "لا توجد دورات بعد.",
  none: "بدون دورة",
  projectSection: "دورات المشروع",
  count: (n: number) => `${n} ${n === 1 ? "دورة" : "دورات"}`,
  agileFeature: "دورات تنفيذ",
  agileFeatureText: "خطّط الدورة، حدّد الهدف، وراقب سرعة الفريق.",
} as const;

export const roleLabels: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير مشاريع",
  developer: "مطوّر",
};

export const transactionCategories = {
  income: ["دفعة مشروع", "اشتراك دعم", "استشارة", "أخرى"],
  expense: ["رواتب", "مكافأة", "خصم", "أدوات وبرمجيات", "استضافة", "تسويق", "مصاريف إدارية", "أخرى"],
};

export type TxTypeLabel = "general" | "project_payment" | "payroll" | "company_expense";
export type PaymentStatusLabel = "planned" | "invoiced" | "paid" | "overdue";
export type ExpenseScopeLabel = "company" | "project";
export type PaymentMethodLabel = "bank_transfer" | "cash" | "ccp" | "paypal" | "other";
export type EmploymentTypeLabel = "full_time" | "part_time" | "contract";

export const txTypeLabels: Record<TxTypeLabel, string> = {
  general: "عام",
  project_payment: "دفعة مشروع",
  payroll: "راتب",
  company_expense: "مصروف شركة",
};

export const paymentStatusLabels: Record<PaymentStatusLabel, string> = {
  planned: "مخطط",
  invoiced: "مفوتر",
  paid: "محصّل",
  overdue: "متأخر",
};

export const expenseScopeLabels: Record<ExpenseScopeLabel, string> = {
  company: "شركة",
  project: "مشروع",
};

export const paymentMethodLabels: Record<PaymentMethodLabel, string> = {
  bank_transfer: "تحويل بنكي",
  cash: "نقداً",
  ccp: "CCP",
  paypal: "PayPal",
  other: "أخرى",
};

export const employmentTypeLabels: Record<EmploymentTypeLabel, string> = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  contract: "عقد",
};

export function formatCurrency(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return `${amount.toLocaleString("ar-EG", { maximumFractionDigits: 0 })} د.ج`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ar-EG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysLeft(deadline: string | null | undefined) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

export function statusTone(status: string) {
  switch (status) {
    case "completed":
    case "done":
    case "active":
      return "success" as const;
    case "on_hold":
    case "overdue":
      return "destructive" as const;
    case "in_review":
    case "review":
      return "warning" as const;
    default:
      return "info" as const;
  }
}
