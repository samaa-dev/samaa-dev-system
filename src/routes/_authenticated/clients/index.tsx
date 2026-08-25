import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/AppShell";
import { DataTable } from "@/components/DataTable";
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
import { useCurrentUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { clientContactsQuery, clientsQuery, projectsQuery, type Client } from "@/lib/data";
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
  const { data: clients = [] } = useQuery(clientsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());
  const { data: contacts = [] } = useQuery({ ...clientContactsQuery(), enabled: Boolean(me?.isStaff) });
  const contactFor = (id: string) => contacts.find((c) => c.client_id === id);

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
        ]}
      />
    </AppShell>
  );
}

function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", notes: "" });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name: form.name.trim(), company: form.company.trim() || null })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      const email = form.email.trim();
      const phone = form.phone.trim();
      const notes = form.notes.trim();
      if (email || phone || notes) {
        const contact = await supabase.from("client_contacts").insert({
          client_id: data.id,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
        });
        if (contact.error) throw new Error(contact.error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["client-contacts"] });
      toast.success("تمت إضافة العميل");
      setOpen(false);
      setForm({ name: "", company: "", email: "", phone: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4" />عميل جديد</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>عميل جديد</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="c-name">اسم العميل / الشركة</Label>
            <Input id="c-name" maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="c-contact">الشركة</Label>
              <Input id="c-contact" maxLength={120} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="c-phone">الهاتف</Label>
              <Input id="c-phone" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-email">البريد الإلكتروني</Label>
            <Input id="c-email" type="email" maxLength={255} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="c-notes">ملاحظات</Label>
            <Textarea id="c-notes" maxLength={1000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}>
            {mutation.isPending ? "جارٍ الحفظ…" : "حفظ العميل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
