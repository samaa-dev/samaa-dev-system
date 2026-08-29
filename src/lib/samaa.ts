// Shared domain constants, Arabic labels and formatters for the Samaa Dev system.

export type ProjectStatus = "planning" | "active" | "in_review" | "completed" | "on_hold";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";
export type Priority = "high" | "medium" | "low";
export type SprintStatus = "planned" | "active" | "completed";
export type BoardStage = "waiting" | "design" | "active_work" | "urgent_delivery";
/** Includes operational lanes plus completed for /overview filtering. */
export type ProjectBoardLane = BoardStage | "completed";
export type CycleBoardStage = "waiting" | "active_work" | "in_review" | "completed";
export type SprintProgressMode = "auto" | "manual";

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
  review: "مراجعة",
  done: "مكتمل",
};

/** Short encouraging copy for task pulse UI on /overview. */
export const taskPulseCopy: Record<
  TaskStatus,
  { nudge: string; cheer: string; action: string }
> = {
  backlog: {
    nudge: "جاهزة حين يحين وقتها — لا ضغط الآن.",
    cheer: "وضعتها في الانتظار بذكاء.",
    action: "إلى الانتظار",
  },
  todo: {
    nudge: "خطوة واحدة صغيرة تكفي للبداية.",
    cheer: "المهمة واضحة وجاهزة للانطلاق.",
    action: "ابدأ الآن",
  },
  in_progress: {
    nudge: "أنت في الجو — أكمل ما بدأته.",
    cheer: "الزخم موجود، استمر بلطف.",
    action: "قيد العمل",
  },
  review: {
    nudge: "قربت من النهاية — راجع بهدوء.",
    cheer: "عمل يستحق نظرة أخيرة.",
    action: "للمراجعة",
  },
  done: {
    nudge: "نفس عميق… أنجزت هذا.",
    cheer: "أحسنت — مهمة مكتملة.",
    action: "اكتملت",
  },
};

export type OverviewTaskLane = "waiting" | "in_progress" | "done_today";

export const overviewTaskLaneLabels: Record<OverviewTaskLane, string> = {
  waiting: "قيد الانتظار",
  in_progress: "قيد العمل",
  done_today: "مكتملة اليوم",
};

export function resolveOverviewTaskLane(status: string): OverviewTaskLane {
  if (status === "done") return "done_today";
  if (status === "in_progress") return "in_progress";
  return "waiting";
}

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

export const boardStageLabels: Record<BoardStage, string> = {
  waiting: "قيد الانتظار",
  design: "قيد التصميم",
  active_work: "قيد العمل",
  urgent_delivery: "تسليم عاجل",
};

/** Visual chrome for overview board columns (header + accent). */
export const boardStageChrome: Record<
  BoardStage,
  { header: string; count: string; border: string; accent: string }
> = {
  waiting: {
    header: "bg-slate-500/15 text-slate-800 dark:text-slate-100",
    count: "bg-slate-600 text-white dark:bg-slate-200 dark:text-slate-900",
    border: "border-slate-400/40",
    accent: "bg-slate-500",
  },
  design: {
    header: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
    count: "bg-sky-600 text-white dark:bg-sky-300 dark:text-sky-950",
    border: "border-sky-400/40",
    accent: "bg-sky-500",
  },
  active_work: {
    header: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
    count: "bg-emerald-600 text-white dark:bg-emerald-300 dark:text-emerald-950",
    border: "border-emerald-400/40",
    accent: "bg-emerald-500",
  },
  urgent_delivery: {
    header: "bg-amber-500/20 text-amber-950 dark:text-amber-100",
    count: "bg-amber-600 text-white dark:bg-amber-300 dark:text-amber-950",
    border: "border-amber-500/50",
    accent: "bg-amber-500",
  },
};

export const boardStages: BoardStage[] = [
  "waiting",
  "design",
  "active_work",
  "urgent_delivery",
];

export const projectCompletedLabel = "مكتمل";

export const cycleBoardStageLabels: Record<CycleBoardStage, string> = {
  waiting: "قيد الانتظار",
  active_work: "قيد العمل",
  in_review: "قيد المراجعة",
  completed: "مكتملة",
};

export const cycleBoardStageChrome: Record<
  CycleBoardStage,
  { header: string; count: string; border: string; accent: string }
> = {
  waiting: {
    header: "bg-slate-500/15 text-slate-800 dark:text-slate-100",
    count: "bg-slate-600 text-white dark:bg-slate-200 dark:text-slate-900",
    border: "border-slate-400/40",
    accent: "bg-slate-500",
  },
  active_work: {
    header: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
    count: "bg-emerald-600 text-white dark:bg-emerald-300 dark:text-emerald-950",
    border: "border-emerald-400/40",
    accent: "bg-emerald-500",
  },
  in_review: {
    header: "bg-amber-500/20 text-amber-950 dark:text-amber-100",
    count: "bg-amber-600 text-white dark:bg-amber-300 dark:text-amber-950",
    border: "border-amber-500/50",
    accent: "bg-amber-500",
  },
  completed: {
    header: "bg-zinc-500/15 text-zinc-800 dark:text-zinc-100",
    count: "bg-zinc-600 text-white dark:bg-zinc-300 dark:text-zinc-950",
    border: "border-zinc-400/40",
    accent: "bg-zinc-500",
  },
};

export const cycleBoardStages: CycleBoardStage[] = [
  "waiting",
  "active_work",
  "in_review",
  "completed",
];

/** Active cycle lanes on /overview (excludes completed). */
export const cycleOperationalStages = cycleBoardStages.filter(
  (s): s is Exclude<CycleBoardStage, "completed"> => s !== "completed",
);

export const sprintProgressModeLabels: Record<SprintProgressMode, string> = {
  auto: "تلقائي",
  manual: "يدوي",
};

/** Resolve board lane for /overview when board_stage is missing. */
export function resolveBoardStage(project: {
  board_stage?: string | null;
  status: string;
}): ProjectBoardLane {
  if (project.status === "completed") return "completed";
  const raw = project.board_stage;
  if (raw === "waiting" || raw === "design" || raw === "active_work" || raw === "urgent_delivery") {
    return raw;
  }
  if (project.status === "active") return "active_work";
  if (project.status === "in_review") return "urgent_delivery";
  return "waiting";
}

/** Map operational project board stage to Firestore status when leaving completed. */
export function projectStatusForBoardStage(stage: BoardStage): ProjectStatus {
  if (stage === "waiting") return "planning";
  return "active";
}

/** Resolve cycle board lane for /overview when board_stage is missing. */
export function resolveCycleBoardStage(sprint: {
  board_stage?: string | null;
  status: string;
}): CycleBoardStage {
  const raw = sprint.board_stage;
  if (
    raw === "waiting" ||
    raw === "active_work" ||
    raw === "in_review" ||
    raw === "completed"
  ) {
    return raw;
  }
  if (sprint.status === "completed") return "completed";
  if (sprint.status === "active") return "active_work";
  return "waiting";
}

/** Map cycle board stage to Firestore sprint status. */
export function sprintStatusForBoardStage(stage: CycleBoardStage): SprintStatus {
  if (stage === "completed") return "completed";
  if (stage === "waiting") return "planned";
  return "active";
}

/** Map sprint status to overview board stage (when board_stage is not set explicitly). */
export function cycleBoardStageForSprintStatus(status: string): CycleBoardStage {
  if (status === "completed") return "completed";
  if (status === "active") return "active_work";
  return "waiting";
}

export function clampPercent(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Arabic UI labels for sprints (shown as «الدورات» in the product). */
export const sprintUiLabels = {
  module: "الدورات",
  singular: "دورة",
  singularDefinite: "الدورة",
  new: "دورة جديدة",
  name: "اسم الدورة",
  goal: "الهدف",
  save: "حفظ الدورة",
  created: "تم إنشاء الدورة",
  active: "دورات نشطة",
  empty: "لا توجد دورات بعد.",
  none: "بدون دورة",
  projectSection: "دورات المشروع",
  count: (n: number) => `${n} ${n === 1 ? "دورة" : "دورات"}`,
  agileFeature: "دورات تنفيذ",
  agileFeatureText: "خطّط الدورة، حدّد الهدف، وراقب تقدّم الفريق.",
} as const;

/** Short Arabic labels for everyday create/edit forms. */
export const formUiLabels = {
  projectDescription: "الوصف",
  clientName: "اسم العميل",
  email: "البريد",
  phone: "الهاتف",
  note: "ملاحظة",
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
