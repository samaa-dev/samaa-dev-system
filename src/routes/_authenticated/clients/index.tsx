import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { deleteDoc, doc, setDoc, updateDoc } from "firebase/firestore";

import { AppShell } from "@/components/layout/AppShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { DataTable } from "@/components/DataTable";
import { RowActions } from "@/components/RowActions";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import type { Client } from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { clientContactsQuery, clientsQuery, projectsQuery } from "@/lib/data";
import { formatDate } from "@/lib/samaa";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "العملاء — Samaa Dev" },
      { name: "description", content: "سجل عملاء وكالة Samaa Dev وبيانات التواصل ومشاريعهم." },
      { property: "og:title", content: "العملاء — Samaa Dev" },
      { property: "og:description", content: "قائمة العملاء وعدد مشاريع كل عميل." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data: me } = useCurrentUser();
  const queryClient = useQueryClient();
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: contacts = [] } = useQuery({ ...clientContactsQuery(), enabled: Boolean(me?.isStaff) });
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const contactFor = (id: string) => contacts.find((c) => c.client_id === id);

  const remove = useMutation({
    mutationFn: async (id: string) =>
      withFirebaseError(async () => {
        await deleteDoc(doc(getDb(), "clients", id));
        try {
          await deleteDoc(doc(getDb(), "client_contacts", id));
        } catch {
          /* contact doc may not exist */
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      toast.success("تم حذف العميل");
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="العملاء"
      description={`${clients.length} عميل`}
      actions={me?.isStaff ? <NewClientDialog /> : undefined}
    >
      <DataTable
        rows={clients}
        searchPlaceholder="ابحث عن عميل…"
        emptyState="لا يوجد عملاء بعد."
        columns={[
          {
            key: "name",
            header: "العميل",
            value: (c: Client) => c.name,
            cell: (c: Client) => <span className="font-medium">{c.name}</span>,
          },
          {
            key: "company",
            header: "الشركة",
            value: (c: Client) => c.company ?? "",
            cell: (c: Client) => c.company ?? "—",
          },
          {
            key: "email",
            header: "البريد",
            value: (c: Client) => contactFor(c.id)?.email ?? "",
            cell: (c: Client) => contactFor(c.id)?.email ?? "—",
          },
          {
            key: "phone",
            header: "الهاتف",
            value: (c: Client) => contactFor(c.id)?.phone ?? "",
            cell: (c: Client) => contactFor(c.id)?.phone ?? "—",
          },
          {
            key: "satisfaction",
            header: "رضا العميل",
            value: (c: Client) => contactFor(c.id)?.satisfaction ?? "",
            cell: (c: Client) => {
              const s = contactFor(c.id)?.satisfaction;
              return s ? `${s}/5` : "—";
            },
          },
          {
            key: "projects",
            header: "المشاريع",
            value: (c: Client) => projects.filter((p) => p.client_id === c.id).length,
            cell: (c: Client) => projects.filter((p) => p.client_id === c.id).length,
          },
          {
            key: "created",
            header: "تاريخ الإضافة",
            value: (c: Client) => c.created_at,
            cell: (c: Client) => formatDate(c.created_at),
          },
          ...(me?.isStaff
            ? [{
                key: "actions",
                header: "",
                cell: (c: Client) => (
                  <RowActions
                    onEdit={() => setEditClient(c)}
                    onDelete={me.isAdmin ? () => setDeleteId(c.id) : undefined}
                    canDelete={me.isAdmin}
                  />
                ),
              }]
            : []),
        ]}
      />

      {editClient ? (
        <EditClientDialog
          client={editClient}
          contact={contactFor(editClient.id)}
          open
          onOpenChange={(o) => !o && setEditClient(null)}
        />
      ) : null}

      <ConfirmDelete
        open={Boolean(deleteId)}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="حذف العميل"
        description="سيتم حذف العميل وبيانات التواصل."
        pending={remove.isPending}
        onConfirm={() => deleteId && remove.mutate(deleteId)}
      />
    </AppShell>
  );
}

type ClientForm = {
  name: string;
  company: string;
  email: string;
  phone: string;
  notes: string;
  satisfaction: string;
};

function ClientFormFields({
  form,
  setForm,
  mode,
}: {
  form: ClientForm;
  setForm: (f: ClientForm) => void;
  mode: "create" | "edit";
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="c-name">اسم العميل</Label>
        <Input id="c-name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      {mode === "edit" ? (
        <div className="grid gap-2">
          <Label htmlFor="c-contact">الشركة</Label>
          <Input id="c-contact" maxLength={120} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="c-phone">الهاتف</Label>
          <Input id="c-phone" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="c-email">البريد</Label>
          <Input id="c-email" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      {mode === "edit" ? (
        <>
          <div className="grid gap-2">
            <Label htmlFor="c-satisfaction">رضا العميل (1–5)</Label>
            <Select
              value={form.satisfaction || "__none__"}
              onValueChange={(v) => setForm({ ...form, satisfaction: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="بدون تقييم" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون تقييم</SelectItem>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-notes">ملاحظات</Label>
            <Textarea id="c-notes" maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientForm>({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    satisfaction: "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const id = newId();
        const now = nowIso();
        await setDoc(doc(getDb(), "clients", id), {
          name: form.name.trim(),
          company: null,
          created_by: getFirebaseAuth().currentUser?.uid ?? null,
          created_at: now,
          updated_at: now,
        });

        await setDoc(doc(getDb(), "client_contacts", id), {
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          notes: null,
          satisfaction: null,
          created_at: now,
          updated_at: now,
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      toast.success("تمت إضافة العميل");
      setOpen(false);
      setForm({ name: "", company: "", email: "", phone: "", notes: "", satisfaction: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />عميل جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
        <ClientFormFields form={form} setForm={setForm} mode="create" />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ العميل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({
  client,
  contact,
  open,
  onOpenChange,
}: {
  client: Client;
  contact?: { email: string | null; phone: string | null; notes: string | null; satisfaction: number | null; created_at?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientForm>({
    name: client.name,
    company: client.company ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    notes: contact?.notes ?? "",
    satisfaction: contact?.satisfaction ? String(contact.satisfaction) : "",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const now = nowIso();
        await updateDoc(doc(getDb(), "clients", client.id), {
          name: form.name.trim(),
          company: form.company.trim() || null,
          updated_at: now,
        });
        await setDoc(
          doc(getDb(), "client_contacts", client.id),
          {
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            notes: form.notes.trim() || null,
            satisfaction: form.satisfaction ? Number(form.satisfaction) : null,
            created_at: contact?.created_at ?? now,
            updated_at: now,
          },
          { merge: true },
        );
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      toast.success("تم تحديث العميل");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>تعديل العميل</DialogTitle></DialogHeader>
        <ClientFormFields form={form} setForm={setForm} mode="edit" />
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
