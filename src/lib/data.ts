import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Project = Tables<"projects">;
export type Milestone = Tables<"milestones">;
export type Resource = Tables<"project_resources">;
export type Sprint = Tables<"sprints">;
export type Task = Tables<"tasks">;
export type Transaction = Tables<"transactions">;
export type Profile = Tables<"profiles">;

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export type ClientContact = Tables<"client_contacts">;

export const clientsQuery = () =>
  queryOptions({
    queryKey: ["clients"],
    queryFn: async () =>
      unwrap<Client[]>(await supabase.from("clients").select("*").order("created_at", { ascending: false })),
  });

/** Sensitive client contact details — readable only by staff (admin/manager). */
export const clientContactsQuery = () =>
  queryOptions({
    queryKey: ["client-contacts"],
    queryFn: async () => unwrap<ClientContact[]>(await supabase.from("client_contacts").select("*")),
  });

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      unwrap<Project[]>(await supabase.from("projects").select("*").order("created_at", { ascending: false })),
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data as Project | null;
    },
  });

export const milestonesQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["milestones", projectId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("milestones").select("*").order("due_date", { ascending: true });
      if (projectId) q = q.eq("project_id", projectId);
      return unwrap<Milestone[]>(await q);
    },
  });

export const resourcesQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["resources", projectId],
    queryFn: async () =>
      unwrap<Resource[]>(
        await supabase.from("project_resources").select("*").eq("project_id", projectId).order("created_at"),
      ),
  });

export const sprintsQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["sprints", projectId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("sprints").select("*").order("start_date", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      return unwrap<Sprint[]>(await q);
    },
  });

export const tasksQuery = (filters?: { projectId?: string; sprintId?: string }) =>
  queryOptions({
    queryKey: ["tasks", filters?.projectId ?? "all", filters?.sprintId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").order("position", { ascending: true });
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.sprintId) q = q.eq("sprint_id", filters.sprintId);
      return unwrap<Task[]>(await q);
    },
  });

export const transactionsQuery = () =>
  queryOptions({
    queryKey: ["transactions"],
    queryFn: async () =>
      unwrap<Transaction[]>(
        await supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
      ),
  });

export const teamQuery = () =>
  queryOptions({
    queryKey: ["team"],
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profiles.error) throw new Error(profiles.error.message);
      if (roles.error) throw new Error(roles.error.message);
      return (profiles.data ?? []).map((p) => ({
        ...p,
        roles: (roles.data ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as string),
      }));
    },
  });

/** Completion percentage of a project from its tasks and milestones. */
export function projectProgress(tasks: Task[], milestones: Milestone[]) {
  const taskTotal = tasks.length;
  const taskDone = tasks.filter((t) => t.status === "done").length;
  const msTotal = milestones.length;
  const msDone = milestones.filter((m) => m.is_completed).length;
  if (!taskTotal && !msTotal) return 0;
  const taskPart = taskTotal ? taskDone / taskTotal : null;
  const msPart = msTotal ? msDone / msTotal : null;
  const parts = [taskPart, msPart].filter((p): p is number => p !== null);
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}
