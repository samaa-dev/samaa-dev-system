export type AppRole = "admin" | "manager" | "developer";

export type Profile = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoles = {
  id: string;
  roles: AppRole[];
  created_at: string;
};

export type ClientContact = {
  client_id: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  satisfaction: number | null;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  name: string;
  company: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  name: string;
  client_id: string | null;
  scope_of_work: string | null;
  budget: number;
  start_date: string | null;
  deadline: string | null;
  status: string;
  priority: string;
  /** Operational board lane on /overview (independent of status). */
  board_stage?: string | null;
  /** Manual progress 0–100 for /overview (not derived from tasks/payments). */
  progress_percent?: number | null;
  /** auto = from tasks/milestones; manual = use progress_percent. */
  progress_mode?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  amount: number;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Resource = {
  id: string;
  project_id: string;
  kind: string;
  label: string;
  url: string;
  created_at: string;
};

export type Sprint = {
  id: string;
  project_id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
  /** Operational board lane on /overview (waiting | active_work | in_review | completed). */
  board_stage?: string | null;
  /** auto = from tasks; manual = use progress_percent. */
  progress_mode?: string | null;
  progress_percent?: number | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  assignee_id: string | null;
  estimated_hours: number;
  actual_hours: number;
  due_date: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TxType = "general" | "project_payment" | "payroll" | "company_expense";
export type PaymentStatus = "planned" | "invoiced" | "paid" | "overdue";
export type ExpenseScope = "company" | "project";
export type PaymentMethod = "bank_transfer" | "cash" | "ccp" | "paypal" | "other";
export type EmploymentType = "full_time" | "part_time" | "contract";

export type Transaction = {
  id: string;
  kind: string;
  amount: number;
  category: string | null;
  description: string | null;
  occurred_on: string;
  due_date: string | null;
  is_paid: boolean;
  client_id: string | null;
  project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  /** Defaults to "general" for legacy docs. */
  tx_type?: TxType;
  milestone_id?: string | null;
  invoice_number?: string | null;
  payment_method?: PaymentMethod | null;
  reference?: string | null;
  tax_amount?: number | null;
  payment_status?: PaymentStatus | null;
  payee_id?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  base_amount?: number | null;
  bonus?: number | null;
  deductions?: number | null;
  expense_scope?: ExpenseScope | null;
  vendor?: string | null;
};

export type PayrollProfile = {
  id: string;
  monthly_salary: number | null;
  employment_type: EmploymentType | null;
  notes: string | null;
  updated_at: string;
};

export type KpiFormat = "currency" | "number" | "percent";

export type KpiWidgetConfig = {
  id: string;
  enabled: boolean;
  order: number;
  label?: string;
  target?: number | null;
  manual_value?: number | null;
  format?: KpiFormat;
  show_target_bar?: boolean;
};

export type KpiSettings = {
  updated_at: string;
  updated_by: string | null;
  widgets: KpiWidgetConfig[];
};
