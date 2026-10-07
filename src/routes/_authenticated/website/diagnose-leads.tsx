import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { useMemo, useState } from "react";
import { Archive, Minus, Phone, Plus, RotateCcw, Search } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-auth";
import { getDb } from "@/integrations/firebase/client";
import type {
  SiteDiagnosticFollowUpNote,
  SiteDiagnosticFunnelStatus,
  SiteDiagnosticLead,
  SiteDiagnosticLeadStatus,
  SiteDiagnosticLeadUtm,
  SiteDiagnosticStatusHistoryEntry,
} from "@/integrations/firebase/types";
import { newId, nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { siteDiagnosticLeadsQuery } from "@/lib/data";
import {
  SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS,
  SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS,
  SITE_DIAGNOSTIC_LEAD_STATUS_LABELS,
} from "@/lib/site-defaults";
import { formatDateTime, formatRelativeAgo, isOlderThan24Hours } from "@/lib/samaa";
import { cn } from "@/lib/utils";
import {
  leadUtm,
  uniqueUtmCampaigns,
  utmCampaignKey,
  utmDisplayLabel,
  utmToneFor,
} from "@/lib/utm-display";

export const Route = createFileRoute("/_authenticated/website/diagnose-leads")({
  head: () => ({
    meta: [
      { title: "طلبات الحجز — صفحة الهبوط — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WebsiteDiagnoseLeadsPage,
});

type LeadSourceFilter = "all" | "diagnose" | "idea_consult" | "landing";
type FunnelFilter = "all" | SiteDiagnosticFunnelStatus;
type StatusFilter = "all" | SiteDiagnosticLeadStatus;
type ArchiveFilter = "active" | "archived";
type UtmCampaignFilter = "all" | "none" | string;

function leadSource(l: SiteDiagnosticLead): "diagnose" | "idea_consult" | "landing" {
  if (l.source === "idea_consult") return "idea_consult";
  if (l.source === "landing") return "landing";
  return "diagnose";
}

function sourceBadgeTone(src: "diagnose" | "idea_consult" | "landing") {
  if (src === "idea_consult") return "info" as const;
  if (src === "landing") return "warning" as const;
  return "success" as const;
}

function isArchived(l: SiteDiagnosticLead): boolean {
  return l.archived === true;
}

function leadFunnel(l: SiteDiagnosticLead): SiteDiagnosticFunnelStatus {
  if (l.funnel_status === "in_progress" || l.funnel_status === "left_to_idea") {
    return l.funnel_status;
  }
  return "completed";
}

function funnelTone(s: SiteDiagnosticFunnelStatus) {
  if (s === "completed") return "success" as const;
  if (s === "left_to_idea") return "info" as const;
  return "warning" as const;
}

function displayName(l: SiteDiagnosticLead) {
  const n = l.name?.trim();
  if (!n || n === "—") return "زائر (لم يُكمل)";
  return n;
}

function displayPhone(l: SiteDiagnosticLead) {
  const p = l.phone?.trim();
  if (!p || p === "pending") return "";
  return p;
}

function phoneTelHref(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 6) return null;
  return `tel:${cleaned}`;
}

function toneFor(status: SiteDiagnosticLeadStatus) {
  if (status === "closed") return "muted" as const;
  if (status === "qualified") return "success" as const;
  if (status === "contacted") return "info" as const;
  return "warning" as const;
}

function LeadUtmCell({ utm, compact }: { utm: SiteDiagnosticLeadUtm | undefined; compact?: boolean }) {
  if (!utm) {
    return <StatusBadge tone="muted">مباشر</StatusBadge>;
  }
  const label = utmDisplayLabel(utm);
  const tone = utmToneFor(utm.campaign || utm.source || label);
  return (
    <div className={cn("flex flex-col gap-1", compact ? "max-w-full" : "max-w-[200px]")}>
      <StatusBadge tone={tone} className="max-w-full truncate font-semibold">
        {label}
      </StatusBadge>
      {!compact ? (
        <div className="flex flex-wrap gap-1">
          {utm.source ? (
            <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              src: {utm.source}
            </span>
          ) : null}
          {utm.medium ? (
            <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              med: {utm.medium}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function activityIso(lead: SiteDiagnosticLead): string | undefined {
  return lead.last_activity_at || lead.last_contact_at || lead.updated_at || lead.created_at;
}

function sortedNotes(notes: SiteDiagnosticFollowUpNote[] | undefined) {
  return [...(notes ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function sortedHistory(history: SiteDiagnosticStatusHistoryEntry[] | undefined) {
  return [...(history ?? [])].sort((a, b) => b.at.localeCompare(a.at));
}

function CallButton({
  phone,
  className,
  size = "default",
}: {
  phone: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const href = phoneTelHref(phone);
  if (!href) return null;
  return (
    <Button asChild size={size} className={cn("bg-emerald-600 text-white hover:bg-emerald-700", className)}>
      <a href={href}>
        <Phone className="h-4 w-4" />
        اتصال
      </a>
    </Button>
  );
}

function ContactCountControl({
  count,
  onChange,
  pending,
}: {
  count: number;
  onChange: (next: number) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 px-1.5 py-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={pending || count <= 0}
        onClick={() => onChange(Math.max(0, count - 1))}
        aria-label="إنقاص عدد التواصل"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <div className="min-w-[4.5rem] text-center text-xs font-medium">
        تواصل: {count}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        disabled={pending}
        onClick={() => onChange(count + 1)}
        aria-label="زيادة عدد التواصل"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function NoteComposer({
  onAdd,
  pending,
  compact,
}: {
  onAdd: (text: string) => void;
  pending?: boolean;
  compact?: boolean;
}) {
  const [noteDraft, setNoteDraft] = useState("");
  return (
    <div className={cn("space-y-2", compact ? "" : "rounded-xl border border-dashed border-border p-2.5")}>
      {!compact ? (
        <p className="text-[11px] font-medium text-muted-foreground">أضف ملاحظة</p>
      ) : null}
      <Textarea
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        placeholder="أضف ملاحظة متابعة…"
        className="min-h-[68px] resize-none text-sm"
        rows={2}
      />
      <Button
        type="button"
        size="sm"
        className="h-9 w-full"
        disabled={pending || !noteDraft.trim()}
        onClick={() => {
          const text = noteDraft.trim();
          if (!text) return;
          onAdd(text);
          setNoteDraft("");
        }}
      >
        أضف ملاحظة
      </Button>
    </div>
  );
}

function LeadCard({
  lead,
  onDetail,
  onArchive,
  onRestore,
  onStatus,
  onContactCount,
  onAddNote,
  archivePending,
  notePending,
  contactPending,
}: {
  lead: SiteDiagnosticLead;
  onDetail: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onStatus: (status: SiteDiagnosticLeadStatus) => void;
  onContactCount: (count: number) => void;
  onAddNote: (text: string) => void;
  archivePending: boolean;
  notePending: boolean;
  contactPending: boolean;
}) {
  const phone = displayPhone(lead);
  const f = leadFunnel(lead);
  const src = leadSource(lead);
  const activityAt = activityIso(lead);
  const relative = formatRelativeAgo(activityAt);
  const stale = isOlderThan24Hours(activityAt);
  const contactCount = lead.contact_count ?? 0;
  const stepLabel =
    typeof lead.last_step_index === "number" && typeof lead.steps_total === "number"
      ? `${lead.last_step_index + 1}/${lead.steps_total}`
      : null;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-bold">{displayName(lead)}</h3>
          {lead.company ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{lead.company}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge tone={funnelTone(f)}>
            {SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS[f]}
          </StatusBadge>
          {relative ? (
            <span
              className={cn(
                "text-[11px] font-medium",
                stale ? "text-destructive" : "text-muted-foreground",
              )}
              title={activityAt ? formatDateTime(activityAt) : undefined}
            >
              {relative}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <StatusBadge tone={sourceBadgeTone(src)}>
          {SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS[src]}
        </StatusBadge>
        <LeadUtmCell utm={leadUtm(lead)} compact />
        {isArchived(lead) ? <StatusBadge tone="muted">مؤرشف</StatusBadge> : null}
      </div>

      {lead.last_step_title ? (
        <p className="mt-2 text-xs text-muted-foreground">
          توقف عند: {lead.last_step_title}
          {stepLabel ? ` (${stepLabel})` : ""}
        </p>
      ) : null}

      {phone ? (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2.5">
          <span className="text-sm font-medium tracking-wide" dir="ltr">
            {phone}
          </span>
          <CallButton phone={phone} size="sm" className="h-9 shrink-0 px-4" />
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">لا يوجد رقم بعد</p>
      )}

      <div className="mt-3">
        <ContactCountControl
          count={contactCount}
          pending={contactPending}
          onChange={onContactCount}
        />
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <Select
          value={lead.status}
          onValueChange={(v) => onStatus(v as SiteDiagnosticLeadStatus)}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SITE_DIAGNOSTIC_LEAD_STATUS_LABELS) as SiteDiagnosticLeadStatus[]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS[s]}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
        <span className="text-[11px] text-muted-foreground">{formatDateTime(lead.created_at)}</span>
      </div>

      <div className="mt-3">
        <NoteComposer onAdd={onAddNote} pending={notePending} />
        <div className="mt-2 space-y-2">
          {sortedNotes(lead.follow_up_notes).slice(0, 2).map((n) => (
            <div key={n.id} className="rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
              <p className="whitespace-pre-wrap text-foreground">{n.text}</p>
              <p
                className={cn(
                  "mt-1",
                  isOlderThan24Hours(n.created_at) ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {formatRelativeAgo(n.created_at)}
                {" · "}
                {formatDateTime(n.created_at)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-10" onClick={onDetail}>
          التفاصيل
        </Button>
        {isArchived(lead) ? (
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            disabled={archivePending}
            onClick={onRestore}
          >
            <RotateCcw className="h-4 w-4" />
            استعادة
          </Button>
        ) : (
          <Button type="button" variant="ghost" className="h-10" onClick={onArchive}>
            <Archive className="h-4 w-4" />
            أرشفة
          </Button>
        )}
      </div>
    </article>
  );
}

function WebsiteDiagnoseLeadsPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);
  const queryClient = useQueryClient();
  const leads = useQuery({ ...siteDiagnosticLeadsQuery(), enabled });
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<LeadSourceFilter>("landing");
  const [funnelFilter, setFunnelFilter] = useState<FunnelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [utmFilter, setUtmFilter] = useState<UtmCampaignFilter>("all");
  const [search, setSearch] = useState("");

  const allRows = leads.data ?? [];
  const detail = detailId ? (allRows.find((l) => l.id === detailId) ?? null) : null;
  const campaigns = useMemo(() => uniqueUtmCampaigns(allRows), [allRows]);

  const counts = useMemo(() => {
    let diagnose = 0;
    let idea = 0;
    let landing = 0;
    let withUtm = 0;
    let noUtm = 0;
    let inProgress = 0;
    let completed = 0;
    let leftToIdea = 0;
    let active = 0;
    let archived = 0;
    let statusNew = 0;
    let statusContacted = 0;
    let statusQualified = 0;
    let statusClosed = 0;
    for (const l of allRows) {
      if (isArchived(l)) {
        archived += 1;
        continue;
      }
      active += 1;
      const src = leadSource(l);
      if (src === "idea_consult") idea += 1;
      else if (src === "landing") landing += 1;
      else diagnose += 1;
      if (utmCampaignKey(l) || leadUtm(l)) withUtm += 1;
      else noUtm += 1;
      const f = leadFunnel(l);
      if (f === "in_progress") inProgress += 1;
      else if (f === "left_to_idea") leftToIdea += 1;
      else completed += 1;
      if (l.status === "contacted") statusContacted += 1;
      else if (l.status === "qualified") statusQualified += 1;
      else if (l.status === "closed") statusClosed += 1;
      else statusNew += 1;
    }
    return {
      all: active,
      diagnose,
      idea,
      landing,
      withUtm,
      noUtm,
      inProgress,
      completed,
      leftToIdea,
      active,
      archived,
      statusNew,
      statusContacted,
      statusQualified,
      statusClosed,
    };
  }, [allRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter((l) => {
      if (archiveFilter === "archived" ? !isArchived(l) : isArchived(l)) return false;
      if (sourceFilter !== "all" && leadSource(l) !== sourceFilter) return false;
      if (funnelFilter !== "all" && leadFunnel(l) !== funnelFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (utmFilter === "none" && leadUtm(l)) return false;
      if (utmFilter !== "all" && utmFilter !== "none" && utmCampaignKey(l) !== utmFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        displayName(l),
        l.company,
        displayPhone(l),
        l.email,
        l.last_step_title,
        leadUtm(l)?.campaign,
        leadUtm(l)?.source,
        ...(l.follow_up_notes ?? []).map((n) => n.text),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [allRows, sourceFilter, funnelFilter, statusFilter, utmFilter, archiveFilter, search]);

  const invalidateLeads = async () => {
    await queryClient.invalidateQueries({ queryKey: ["site-diagnostic-leads"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      previous,
    }: {
      id: string;
      status: SiteDiagnosticLeadStatus;
      previous: SiteDiagnosticLeadStatus;
    }) =>
      withFirebaseError(async () => {
        if (status === previous) return;
        const at = nowIso();
        const entry: SiteDiagnosticStatusHistoryEntry = { status, at };
        await updateDoc(doc(getDb(), "site_diagnostic_leads", id), {
          status,
          last_activity_at: at,
          updated_at: at,
          status_history: arrayUnion(entry),
        });
      }),
    onSuccess: async () => {
      toast.success("تم تحديث الحالة");
      await invalidateLeads();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setContactCount = useMutation({
    mutationFn: async ({ id, count }: { id: string; count: number }) =>
      withFirebaseError(async () => {
        const next = Math.max(0, Math.floor(count));
        const at = nowIso();
        await updateDoc(doc(getDb(), "site_diagnostic_leads", id), {
          contact_count: next,
          last_contact_at: next > 0 ? at : null,
          last_activity_at: at,
          updated_at: at,
        });
      }),
    onSuccess: async () => {
      await invalidateLeads();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addNote = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) =>
      withFirebaseError(async () => {
        const at = nowIso();
        const note: SiteDiagnosticFollowUpNote = {
          id: newId(),
          text,
          created_at: at,
        };
        await updateDoc(doc(getDb(), "site_diagnostic_leads", id), {
          follow_up_notes: arrayUnion(note),
          last_activity_at: at,
          updated_at: at,
        });
      }),
    onSuccess: async () => {
      toast.success("تم حفظ الملاحظة");
      await invalidateLeads();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setArchived = useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) =>
      withFirebaseError(async () => {
        await updateDoc(doc(getDb(), "site_diagnostic_leads", id), {
          archived,
          archived_at: archived ? nowIso() : null,
          updated_at: nowIso(),
        });
      }),
    onSuccess: async (_d, vars) => {
      toast.success(vars.archived ? "تمت الأرشفة" : "تمت الاستعادة من الأرشيف");
      setArchiveId(null);
      await invalidateLeads();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const emptyByFilter =
    archiveFilter === "archived"
      ? "لا توجد طلبات مؤرشفة."
      : statusFilter !== "all"
        ? "لا توجد طلبات لهذه الحالة."
        : funnelFilter !== "all"
          ? "لا توجد طلبات لهذا فلتر الاكتمال."
          : utmFilter !== "all"
            ? "لا توجد طلبات لهذه الحملة / الفلتر."
            : sourceFilter === "idea_consult"
              ? "لا توجد طلبات استشارة أفكار بعد."
              : sourceFilter === "landing"
                ? "لا توجد طلبات من صفحة الهبوط بعد."
                : sourceFilter === "diagnose"
                  ? "لا توجد طلبات تشخيص شركات بعد."
                  : "لا توجد طلبات بعد.";

  const detailUtm = detail ? leadUtm(detail) : undefined;
  const detailPhone = detail ? displayPhone(detail) : "";
  const detailActivity = detail ? activityIso(detail) : undefined;
  const archiveTarget = archiveId ? allRows.find((l) => l.id === archiveId) : null;
  const confirmingArchive = archiveTarget ? !isArchived(archiveTarget) : true;

  return (
    <LandingShell
      title="طلبات الحجز"
      description="متابعة الطلبات: عدد الاتصالات، ملاحظات سريعة، وسجل الحالات — يتحوّل الوقت للأحمر بعد 24 ساعة"
    >
      <div className="mb-4 space-y-3">
        <Tabs value={archiveFilter} onValueChange={(v) => setArchiveFilter(v as ArchiveFilter)}>
          <TabsList className="h-auto w-full flex-wrap sm:w-auto">
            <TabsTrigger value="active" className="flex-1 sm:flex-none">
              النشطة ({counts.active})
            </TabsTrigger>
            <TabsTrigger value="archived" className="flex-1 sm:flex-none">
              الأرشيف ({counts.archived})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={sourceFilter} onValueChange={(v) => setSourceFilter(v as LeadSourceFilter)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="all">الكل ({counts.all})</TabsTrigger>
            <TabsTrigger value="diagnose">
              {SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS.diagnose} ({counts.diagnose})
            </TabsTrigger>
            <TabsTrigger value="landing">
              {SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS.landing} ({counts.landing})
            </TabsTrigger>
            <TabsTrigger value="idea_consult">
              {SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS.idea_consult} ({counts.idea})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الرقم أو الحملة…"
            className="h-11 pe-9"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="حالة المتابعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="new">
                {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS.new} ({counts.statusNew})
              </SelectItem>
              <SelectItem value="contacted">
                {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS.contacted} ({counts.statusContacted})
              </SelectItem>
              <SelectItem value="qualified">
                {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS.qualified} ({counts.statusQualified})
              </SelectItem>
              <SelectItem value="closed">
                {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS.closed} ({counts.statusClosed})
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={funnelFilter} onValueChange={(v) => setFunnelFilter(v as FunnelFilter)}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="اكتمال القمع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل حالات الاكتمال</SelectItem>
              <SelectItem value="in_progress">
                {SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS.in_progress} ({counts.inProgress})
              </SelectItem>
              <SelectItem value="completed">
                {SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS.completed} ({counts.completed})
              </SelectItem>
              <SelectItem value="left_to_idea">
                {SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS.left_to_idea} ({counts.leftToIdea})
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={utmFilter} onValueChange={setUtmFilter}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="حملة UTM" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحملات</SelectItem>
              <SelectItem value="none">بدون UTM / مباشر ({counts.noUtm})</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {campaigns.length > 0 && archiveFilter === "active" ? (
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {campaigns.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setUtmFilter(utmFilter === c ? "all" : c)}
                className="shrink-0 transition-opacity hover:opacity-90"
              >
                <StatusBadge
                  tone={utmToneFor(c)}
                  className={utmFilter === c ? "ring-2 ring-offset-1 ring-foreground/30" : "opacity-80"}
                >
                  {c}
                </StatusBadge>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
          {emptyByFilter}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((l) => (
            <LeadCard
              key={l.id}
              lead={l}
              archivePending={setArchived.isPending}
              notePending={addNote.isPending}
              contactPending={setContactCount.isPending}
              onDetail={() => setDetailId(l.id)}
              onArchive={() => setArchiveId(l.id)}
              onRestore={() => setArchived.mutate({ id: l.id, archived: false })}
              onStatus={(status) =>
                updateStatus.mutate({ id: l.id, status, previous: l.status })
              }
              onContactCount={(count) => setContactCount.mutate({ id: l.id, count })}
              onAddNote={(text) => addNote.mutate({ id: l.id, text })}
            />
          ))}
        </div>
      )}

      <ConfirmDelete
        open={Boolean(archiveId)}
        onOpenChange={(o) => !o && setArchiveId(null)}
        title={confirmingArchive ? "أرشفة الطلب" : "استعادة الطلب"}
        description={
          confirmingArchive
            ? "سيُنقل الطلب إلى الأرشيف ويمكنك استعادته لاحقاً من تبويب الأرشيف."
            : "سيُعاد الطلب إلى القائمة النشطة."
        }
        confirmLabel={confirmingArchive ? "أرشفة" : "استعادة"}
        pendingLabel={confirmingArchive ? "جارٍ الأرشفة…" : "جارٍ الاستعادة…"}
        variant="default"
        onConfirm={() =>
          archiveId && setArchived.mutate({ id: archiveId, archived: confirmingArchive })
        }
        pending={setArchived.isPending}
      />

      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[90dvh] gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
            <DialogTitle className="text-start text-base sm:text-lg">
              {detail ? SITE_DIAGNOSTIC_LEAD_SOURCE_LABELS[leadSource(detail)] : "التفاصيل"}
              {detail ? ` — ${displayName(detail)}` : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[calc(90dvh-8rem)] space-y-3 overflow-y-auto px-4 py-4 text-sm sm:px-6">
            {detailPhone ? (
              <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">رقم التواصل</p>
                    <p className="truncate font-medium tracking-wide" dir="ltr">
                      {detailPhone}
                    </p>
                    {detailActivity ? (
                      <p
                        className={cn(
                          "mt-1 text-[11px]",
                          isOlderThan24Hours(detailActivity)
                            ? "font-medium text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        آخر نشاط {formatRelativeAgo(detailActivity)}
                        {" · "}
                        {formatDateTime(detailActivity)}
                      </p>
                    ) : null}
                  </div>
                  <CallButton phone={detailPhone} size="lg" className="h-11 shrink-0 px-5" />
                </div>
              </div>
            ) : null}

            {detail ? (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={funnelTone(leadFunnel(detail))}>
                    {SITE_DIAGNOSTIC_FUNNEL_STATUS_LABELS[leadFunnel(detail)]}
                  </StatusBadge>
                  <StatusBadge tone={toneFor(detail.status)}>
                    {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS[detail.status]}
                  </StatusBadge>
                  {isArchived(detail) ? <StatusBadge tone="muted">مؤرشف</StatusBadge> : null}
                </div>
                {detail.last_step_title ? (
                  <p className="text-xs text-muted-foreground">
                    توقف عند: {detail.last_step_title}
                    {typeof detail.last_step_index === "number" &&
                    typeof detail.steps_total === "number"
                      ? ` (${detail.last_step_index + 1}/${detail.steps_total})`
                      : ""}
                  </p>
                ) : null}
                <div className="mt-3">
                  <ContactCountControl
                    count={detail.contact_count ?? 0}
                    pending={setContactCount.isPending}
                    onChange={(count) => setContactCount.mutate({ id: detail.id, count })}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  تاريخ الطلب: {formatDateTime(detail.created_at)}
                </p>
              </div>
            ) : null}

            {detail ? (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  سجل الحالات
                </div>
                {sortedHistory(detail.status_history).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    لا يوجد سجل بعد — أي تغيير حالة (تم التواصل، مؤهّل، …) يُحفظ هنا.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {sortedHistory(detail.status_history).map((h, i) => (
                      <li
                        key={`${h.status}-${h.at}-${i}`}
                        className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <StatusBadge tone={toneFor(h.status)}>
                          {SITE_DIAGNOSTIC_LEAD_STATUS_LABELS[h.status] ?? h.status}
                        </StatusBadge>
                        <span
                          className={cn(
                            "text-[11px]",
                            isOlderThan24Hours(h.at)
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelativeAgo(h.at)}
                          {" · "}
                          {formatDateTime(h.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {detail ? (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 text-xs font-medium text-muted-foreground">
                  ملاحظات المتابعة
                </div>
                <NoteComposer
                  compact
                  pending={addNote.isPending}
                  onAdd={(text) => addNote.mutate({ id: detail.id, text })}
                />
                {sortedNotes(detail.follow_up_notes).length === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">لا توجد ملاحظات بعد.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {sortedNotes(detail.follow_up_notes).map((n) => (
                      <li key={n.id} className="rounded-lg bg-muted/40 px-2.5 py-2">
                        <p className="whitespace-pre-wrap text-foreground">{n.text}</p>
                        <p
                          className={cn(
                            "mt-1 text-[11px]",
                            isOlderThan24Hours(n.created_at)
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatRelativeAgo(n.created_at)}
                          {" · "}
                          {formatDateTime(n.created_at)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {detailUtm ? (
              <div className="rounded-xl border border-border p-3">
                <div className="mb-2 text-xs text-muted-foreground">مصدر الإعلان (UTM)</div>
                <LeadUtmCell utm={detailUtm} />
              </div>
            ) : (
              <div className="rounded-xl border border-border p-3 text-muted-foreground">
                بدون UTM — دخول مباشر.
              </div>
            )}

            {detail && leadSource(detail) === "idea_consult" ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="font-medium">استشارة توجيهية بالذكاء الاصطناعي</div>
                <div className="mt-1 text-muted-foreground">
                  {typeof detail.price_dzd === "number"
                    ? `${detail.price_dzd.toLocaleString("ar-DZ")} دج`
                    : "6٬000 دج"}
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground">
                {detail && leadSource(detail) === "idea_consult" ? "الفكرة" : "الشركة"}
              </div>
              <div className="mt-1">{detail?.company || "—"}</div>
              {detail?.email ? (
                <div className="mt-2 text-xs text-muted-foreground" dir="ltr">
                  {detail.email}
                </div>
              ) : null}
            </div>

            {(detail?.answers_snapshot ?? []).map((a, i) => (
              <div key={`${a.question_id}-${i}`} className="rounded-xl border border-border p-3">
                <div className="font-medium text-foreground">{a.question_text}</div>
                <div className="mt-1 whitespace-pre-wrap text-muted-foreground">{a.answer || "—"}</div>
              </div>
            ))}
            {!detail?.answers_snapshot?.length ? (
              <p className="text-muted-foreground">لا توجد إجابات محفوظة.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </LandingShell>
  );
}
