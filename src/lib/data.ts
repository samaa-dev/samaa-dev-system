import { queryOptions } from "@tanstack/react-query";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { getDb } from "@/integrations/firebase/client";
import { docsToRows, docToRow, withFirebaseError } from "@/integrations/firebase/helpers";
import type {
  Client,
  ClientContact,
  KpiSettings,
  Milestone,
  PayrollProfile,
  Profile,
  Project,
  Resource,
  Sprint,
  Task,
  Transaction,
  UserRoles,
} from "@/integrations/firebase/types";

export type { Client, ClientContact, Milestone, PayrollProfile, Profile, Project, Resource, Sprint, Task, Transaction };

export const clientsQuery = () =>
  queryOptions({
    queryKey: ["clients"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(query(collection(getDb(), "clients"), orderBy("created_at", "desc")));
        return docsToRows<Client>(snap.docs);
      }),
  });

/** Sensitive client contact details — readable only by staff (admin/manager). */
export const clientContactsQuery = () =>
  queryOptions({
    queryKey: ["client-contacts"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(collection(getDb(), "client_contacts"));
        return snap.docs.map((d) => {
          const data = d.data() as Omit<ClientContact, "client_id">;
          return {
            client_id: d.id,
            email: data.email ?? null,
            phone: data.phone ?? null,
            notes: data.notes ?? null,
            satisfaction: data.satisfaction ?? null,
            created_at: data.created_at,
            updated_at: data.updated_at,
          } satisfies ClientContact;
        });
      }),
  });

export const projectsQuery = () =>
  queryOptions({
    queryKey: ["projects"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(query(collection(getDb(), "projects"), orderBy("created_at", "desc")));
        return docsToRows<Project>(snap.docs);
      }),
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["projects", id],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "projects", id));
        return docToRow<Project>(snap);
      }),
  });

export const milestonesQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["milestones", projectId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "milestones");
        const q = projectId
          ? query(col, where("project_id", "==", projectId), orderBy("due_date", "asc"))
          : query(col, orderBy("due_date", "asc"));
        const snap = await getDocs(q);
        return docsToRows<Milestone>(snap.docs);
      }),
  });

export const resourcesQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["resources", projectId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "project_resources"),
            where("project_id", "==", projectId),
            orderBy("created_at", "asc"),
          ),
        );
        return docsToRows<Resource>(snap.docs);
      }),
  });

export const sprintsQuery = (projectId?: string) =>
  queryOptions({
    queryKey: ["sprints", projectId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "sprints");
        const q = projectId
          ? query(col, where("project_id", "==", projectId), orderBy("start_date", "desc"))
          : query(col, orderBy("start_date", "desc"));
        const snap = await getDocs(q);
        return docsToRows<Sprint>(snap.docs);
      }),
  });

export const sprintQuery = (id: string) =>
  queryOptions({
    queryKey: ["sprints", id],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "sprints", id));
        return docToRow<Sprint>(snap);
      }),
  });

export const kpiSettingsQuery = () =>
  queryOptions({
    queryKey: ["kpi-settings"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "settings", "kpis"));
        if (!snap.exists()) return null;
        return snap.data() as KpiSettings;
      }),
  });

export const tasksQuery = (filters?: { projectId?: string; sprintId?: string }) =>
  queryOptions({
    queryKey: ["tasks", filters?.projectId ?? "all", filters?.sprintId ?? "all"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const col = collection(getDb(), "tasks");
        let q;
        if (filters?.projectId && filters?.sprintId) {
          q = query(
            col,
            where("project_id", "==", filters.projectId),
            where("sprint_id", "==", filters.sprintId),
            orderBy("position", "asc"),
          );
        } else if (filters?.projectId) {
          q = query(col, where("project_id", "==", filters.projectId), orderBy("position", "asc"));
        } else if (filters?.sprintId) {
          q = query(col, where("sprint_id", "==", filters.sprintId), orderBy("position", "asc"));
        } else {
          q = query(col, orderBy("position", "asc"));
        }
        const snap = await getDocs(q);
        return docsToRows<Task>(snap.docs);
      }),
  });

export const transactionsQuery = () =>
  queryOptions({
    queryKey: ["transactions"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(collection(getDb(), "transactions"), orderBy("occurred_on", "desc")),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

export const transactionsByProjectQuery = (projectId: string) =>
  queryOptions({
    queryKey: ["transactions", "project", projectId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "transactions"),
            where("project_id", "==", projectId),
            orderBy("occurred_on", "desc"),
          ),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

/** Payroll rows: staff can omit userId to load all via transactionsQuery filter client-side,
 * or pass userId for a member's own payroll (rules allow get/list of own payee_id docs). */
export const payrollTransactionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["transactions", "payroll", userId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(
          query(
            collection(getDb(), "transactions"),
            where("payee_id", "==", userId),
            where("tx_type", "==", "payroll"),
            orderBy("occurred_on", "desc"),
          ),
        );
        return docsToRows<Transaction>(snap.docs);
      }),
  });

export const payrollProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["payroll-profiles", userId],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDoc(doc(getDb(), "payroll_profiles", userId));
        if (!snap.exists()) return null;
        return { id: snap.id, ...snap.data() } as PayrollProfile;
      }),
  });

export const payrollProfilesQuery = () =>
  queryOptions({
    queryKey: ["payroll-profiles"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const snap = await getDocs(collection(getDb(), "payroll_profiles"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PayrollProfile);
      }),
  });

export const teamQuery = () =>
  queryOptions({
    queryKey: ["team"],
    queryFn: async () =>
      withFirebaseError(async () => {
        const [profilesSnap, rolesSnap] = await Promise.all([
          getDocs(query(collection(getDb(), "profiles"), orderBy("created_at", "asc"))),
          getDocs(collection(getDb(), "user_roles")),
        ]);
        const rolesByUser = new Map<string, string[]>();
        for (const d of rolesSnap.docs) {
          const data = d.data() as UserRoles;
          rolesByUser.set(d.id, (data.roles ?? []) as string[]);
        }
        return docsToRows<Profile>(profilesSnap.docs).map((p) => ({
          ...p,
          roles: rolesByUser.get(p.id) ?? [],
        }));
      }),
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

/** Sprint progress: auto from tasks, or stored manual percent. */
export function sprintProgress(
  sprint: Pick<Sprint, "id" | "progress_mode" | "progress_percent">,
  tasks: Task[],
) {
  const mode = sprint.progress_mode === "manual" ? "manual" : "auto";
  if (mode === "manual") {
    const n = Number(sprint.progress_percent ?? 0);
    return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
  }
  const items = tasks.filter((t) => t.sprint_id === sprint.id);
  if (!items.length) return 0;
  const done = items.filter((t) => t.status === "done").length;
  return Math.round((done / items.length) * 100);
}

export function projectManualProgress(project: Pick<Project, "progress_percent">) {
  const n = Number(project.progress_percent ?? 0);
  return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, Math.round(n)));
}
