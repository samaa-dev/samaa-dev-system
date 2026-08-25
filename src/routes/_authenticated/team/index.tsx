import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { tasksQuery, teamQuery } from "@/lib/data";
import { roleLabels } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/team/")({
  head: () => ({
    meta: [
      { title: "الفريق — Samaa Dev" },
      { name: "description", content: "أعضاء فريق Samaa Dev، أدوارهم وعدد المهام المسندة لكل عضو." },
      { property: "og:title", content: "الفريق — Samaa Dev" },
      { property: "og:description", content: "إدارة أعضاء الفريق والأدوار." },
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

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const del = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (del.error) throw new Error(del.error.message);
      const ins = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as (typeof ROLES)[number] });
      if (ins.error) throw new Error(ins.error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team"] });
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("تم تحديث الدور");
    },
    onError: () => toast.error("لا تملك صلاحية تغيير الأدوار."),
  });

  return (
    <AppShell title="الفريق" description={`${team.length} عضو`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {team.map((m) => {
          const open = tasks.filter((t) => t.assignee_id === m.id && t.status !== "done").length;
          const done = tasks.filter((t) => t.assignee_id === m.id && t.status === "done").length;
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
                    <StatusBadge key={r} tone="primary">{roleLabels[r] ?? r}</StatusBadge>
                  ))
                )}
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                {open} مهمة مفتوحة · {done} مهمة مكتملة
              </p>

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
                      <SelectItem key={r} value={r}>{roleLabels[r] ?? r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
