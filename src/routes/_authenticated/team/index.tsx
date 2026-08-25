import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { doc, setDoc } from "firebase/firestore";

import { AppShell } from "@/components/layout/AppShell";
import { PayrollForm } from "@/components/finance/PayrollForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCurrentUser } from "@/hooks/use-auth";
import {
  addAllowedEmail,
  listAllowedEmails,
  removeAllowedEmail,
} from "@/integrations/firebase/allowlist";
import { getDb } from "@/integrations/firebase/client";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import type { AppRole, EmploymentType } from "@/integrations/firebase/types";
import {
  payrollProfileQuery,
  payrollProfilesQuery,
  payrollTransactionsQuery,
  tasksQuery,
  teamQuery,
  transactionsQuery,
} from "@/lib/data";
import { payrollHistoryForUser } from "@/lib/finance";
import {
  employmentTypeLabels,
  formatCurrency,
  formatDate,
  roleLabels,
} from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => ({
    meta: [
      { title: "الفريق — Samaa Dev" },
      { name: "description", content: "أعضاء فريق Samaa Dev، أدوارهم ورواتبهم." },
      { property: "og:title", content: "الفريق — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamPage,
});

const ROLES = ["admin", "manager", "developer"] as const;

function TeamPage() {
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: team = [] } = useQuery(teamQuery());
  const { data: tasks = [] } = useQuery(tasksQuery());
  const { data: allTransactions = [] } = useQuery({
    ...transactionsQuery(),
    enabled: Boolean(me?.isStaff),
  });
  const { data: payrollProfiles = [] } = useQuery({
    ...payrollProfilesQuery(),
    enabled: Boolean(me?.isStaff),
  });
  const { data: myPayroll = [] } = useQuery({
    ...payrollTransactionsQuery(me?.id ?? ""),
    enabled: Boolean(me?.id) && !me?.isStaff,
  });

  const [payrollMemberId, setPayrollMemberId] = useState<string | null>(null);
  const [payrollFormOpen, setPayrollFormOpen] = useState(false);
  const [payrollFormPayee, setPayrollFormPayee] = useState<string | undefined>();

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) =>
      withFirebaseError(async () => {
        await setDoc(
          doc(getDb(), "user_roles", userId),
          {
            roles: [role as AppRole],
            created_at: nowIso(),
          },
          { merge: true },
        );
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("تم تحديث الدور");
    },
    onError: () => toast.error("لا تملك صلاحية تغيير الأدوار."),
  });

  const paidTotalFor = (userId: string) =>
    payrollHistoryForUser(allTransactions, userId)
      .filter((t) => t.is_paid)
      .reduce((s, t) => s + Number(t.amount), 0);

  const myHistory = useMemo(() => {
    if (me?.isStaff) return [];
    return payrollHistoryForUser(myPayroll, me?.id ?? "");
  }, [myPayroll, me]);

  const myYearTotal = myHistory
    .filter((t) => t.is_paid && (t.occurred_on ?? "").startsWith(String(new Date().getFullYear())))
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <AppShell title="الفريق" description={`${team.length} عضو`}>
      <div className="space-y-8">
        {me?.isAdmin ? <AllowedEmailsPanel adminId={me.id} /> : null}

        {!me?.isStaff && me ? (
          <section className="panel p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">راتبي</h2>
                <p className="text-xs text-muted-foreground">سجل الرواتب الخاصة بك فقط</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">آخر راتب</p>
                <p className="mt-1 text-lg font-bold">
                  {myHistory[0] ? formatCurrency(Number(myHistory[0].amount)) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(myHistory[0]?.occurred_on)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">إجمالي السنة الحالية</p>
                <p className="mt-1 text-lg font-bold">{formatCurrency(myYearTotal)}</p>
              </div>
            </div>
            <div className="mt-4 divide-y divide-border">
              {myHistory.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">لا توجد رواتب مسجّلة بعد.</p>
              ) : (
                myHistory.slice(0, 12).map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {t.period_start
                        ? `${formatDate(t.period_start)} — ${formatDate(t.period_end)}`
                        : formatDate(t.occurred_on)}
                    </span>
                    <span className="font-medium">{formatCurrency(Number(t.amount))}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => {
            const open = tasks.filter((t) => t.assignee_id === m.id && t.status !== "done").length;
            const done = tasks.filter((t) => t.assignee_id === m.id && t.status === "done").length;
            const paid = me?.isStaff ? paidTotalFor(m.id) : null;
            const profile = payrollProfiles.find((p) => p.id === m.id);
            return (
              <article key={m.id} className="panel p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-border">
                    <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name ?? "عضو"} />
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      {(m.full_name ?? "S").slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.full_name ?? "عضو جديد"}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.job_title ?? "—"}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {m.roles.length === 0 ? (
                    <StatusBadge>بدون دور</StatusBadge>
                  ) : (
                    m.roles.map((r) => (
                      <StatusBadge key={r} tone="primary">
                        {roleLabels[r] ?? r}
                      </StatusBadge>
                    ))
                  )}
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  {open} مهمة مفتوحة · {done} مهمة مكتملة
                </p>

                {me?.isStaff ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      إجمالي المدفوع:{" "}
                      <span className="font-semibold text-foreground">{formatCurrency(paid ?? 0)}</span>
                      {profile?.monthly_salary != null ? (
                        <> · أساسي {formatCurrency(profile.monthly_salary)}</>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPayrollMemberId(m.id)}
                      >
                        سجل الرواتب
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPayrollFormPayee(m.id);
                          setPayrollFormOpen(true);
                        }}
                      >
                        صرف راتب
                      </Button>
                    </div>
                  </div>
                ) : null}

                {me?.isAdmin ? (
                  <Select
                    value={m.roles[0] ?? ""}
                    onValueChange={(v) => setRole.mutate({ userId: m.id, role: v })}
                  >
                    <SelectTrigger className="mt-4 h-9 text-xs">
                      <SelectValue placeholder="تعيين دور" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabels[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      {payrollMemberId ? (
        <MemberPayrollDialog
          memberId={payrollMemberId}
          memberName={team.find((m) => m.id === payrollMemberId)?.full_name ?? "عضو"}
          open
          onOpenChange={(o) => !o && setPayrollMemberId(null)}
          transactions={allTransactions}
        />
      ) : null}

      <PayrollForm
        open={payrollFormOpen}
        onOpenChange={setPayrollFormOpen}
        defaultPayeeId={payrollFormPayee}
      />
    </AppShell>
  );
}

function MemberPayrollDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
  transactions,
}: {
  memberId: string;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: import("@/integrations/firebase/types").Transaction[];
}) {
  const queryClient = useQueryClient();
  const history = payrollHistoryForUser(transactions, memberId);
  const { data: profile } = useQuery(payrollProfileQuery(memberId));
  const [salary, setSalary] = useState("");
  const [employment, setEmployment] = useState<EmploymentType | "">("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setSalary(profile?.monthly_salary != null ? String(profile.monthly_salary) : "");
    setEmployment(profile?.employment_type ?? "");
    setNotes(profile?.notes ?? "");
  }, [open, profile]);

  const saveProfile = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        await setDoc(
          doc(getDb(), "payroll_profiles", memberId),
          {
            monthly_salary: salary ? Number(salary) : null,
            employment_type: employment || null,
            notes: notes.trim() || null,
            updated_at: nowIso(),
          },
          { merge: true },
        );
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-profiles"] });
      toast.success("تم حفظ ملف الراتب");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>رواتب — {memberName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-semibold">الراتب الأساسي المرجعي</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>الراتب الشهري (د.ج)</Label>
                <Input type="number" min={0} value={salary} onChange={(e) => setSalary(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>نوع التوظيف</Label>
                <Select
                  value={employment || "__none__"}
                  onValueChange={(v) => setEmployment(v === "__none__" ? "" : (v as EmploymentType))}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {(Object.keys(employmentTypeLabels) as EmploymentType[]).map((k) => (
                      <SelectItem key={k} value={k}>{employmentTypeLabels[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3 grid gap-2">
              <Label>ملاحظات</Label>
              <Textarea value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button
              className="mt-3"
              size="sm"
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
            >
              {saveProfile.isPending ? "جارٍ الحفظ…" : "حفظ الملف"}
            </Button>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">سجل الصرف</h3>
            <div className="divide-y divide-border rounded-lg border border-border">
              {history.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">لا توجد رواتب بعد.</p>
              ) : (
                history.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{formatCurrency(Number(t.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.period_start
                          ? `${formatDate(t.period_start)} — ${formatDate(t.period_end)}`
                          : formatDate(t.occurred_on)}
                      </p>
                    </div>
                    <StatusBadge tone={t.is_paid ? "success" : "warning"}>
                      {t.is_paid ? "مصروف" : "معلق"}
                    </StatusBadge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AllowedEmailsPanel({ adminId }: { adminId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ["allowed-emails"],
    queryFn: listAllowedEmails,
  });

  const add = useMutation({
    mutationFn: async () =>
      addAllowedEmail({
        email,
        createdBy: adminId,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      toast.success("تمت إضافة البريد إلى قائمة الدخول");
      setEmail("");
      setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (target: string) => removeAllowedEmail(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allowed-emails"] });
      toast.success("تم حذف البريد من القائمة");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">الإيميلات المسموح لها بالدخول</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            فقط هذه العناوين تستطيع تسجيل الدخول بحساب Google.
          </p>
        </div>
        <StatusBadge tone="info">{emails.length} بريد</StatusBadge>
      </div>

      <form
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="allow-email">البريد الإلكتروني</Label>
          <Input
            id="allow-email"
            type="email"
            dir="ltr"
            className="text-left"
            placeholder="member@company.com"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="allow-note">ملاحظة (اختياري)</Label>
          <Input
            id="allow-note"
            maxLength={120}
            placeholder="اسم العضو أو دوره"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={!email.trim() || add.isPending} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            {add.isPending ? "جارٍ الإضافة…" : "إضافة"}
          </Button>
        </div>
      </form>

      <div className="mt-5 divide-y divide-border rounded-lg border border-border">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</p>
        ) : emails.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">لا توجد إيميلات بعد. أضف بريداً للسماح بالدخول.</p>
        ) : (
          emails.map((row) => (
            <div
              key={row.email}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" dir="ltr">
                  {row.email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {row.note ? `${row.note} · ` : ""}
                  أُضيف {formatDate(row.created_at)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`حذف ${row.email} من قائمة الدخول؟`)) {
                    remove.mutate(row.email);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                حذف
              </Button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
