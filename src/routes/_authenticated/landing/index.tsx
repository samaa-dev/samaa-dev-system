import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Film } from "lucide-react";

import { LandingShell } from "@/components/landing/LandingShell";
import { useCurrentUser } from "@/hooks/use-auth";
import { siteDiagnosticLeadsQuery, vslSettingsQuery } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/landing/")({
  head: () => ({
    meta: [
      { title: "صفحة الهبوط — Samaa Dev" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LandingOverviewPage,
});

function LandingOverviewPage() {
  const { data: me } = useCurrentUser();
  const enabled = Boolean(me?.isStaff);

  const vsl = useQuery({ ...vslSettingsQuery(), enabled });
  const leads = useQuery({ ...siteDiagnosticLeadsQuery(), enabled });

  const landingLeads = (leads.data ?? []).filter(
    (l) => l.source === "landing" || l.source === "idea_consult",
  );
  const newLanding = landingLeads.filter((l) => l.status === "new" && !l.archived).length;

  const cards = [
    {
      to: "/landing/vsl" as const,
      title: "محتوى الصفحة",
      desc: "الفيديو، العنوان، زر الحجز، واتساب، وMeta Pixel لصفحة الهبوط.",
      icon: Film,
      meta: vsl.data?.video_url ? "فيديو مخصّص محفوظ" : "الفيديو الافتراضي من الموقع",
    },
    {
      to: "/website/diagnose-leads" as const,
      title: "طلبات الحجز",
      desc: "إجابات قمع التشخيص من صفحة الهبوط ومسار الفكرة.",
      icon: ClipboardList,
      meta: newLanding > 0 ? `${newLanding} طلب جديد` : "لا طلبات جديدة",
      highlight: newLanding > 0,
    },
  ];

  return (
    <LandingShell
      title="صفحة الهبوط"
      description="تحكم بما يظهر على landing.html وبطلبات الحجز الواردة منها."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={cn(
              "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              card.highlight && "border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <card.icon className="h-5 w-5" />
              </span>
              <ArrowLeft className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight">{card.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{card.desc}</p>
            </div>
            <p className="mt-auto text-xs font-medium text-muted-foreground">{card.meta}</p>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        مشاريع المعرض المشتركة مع الموقع تُدار من{" "}
        <Link to="/website/projects" className="font-medium text-primary underline-offset-4 hover:underline">
          مشاريع المعرض
        </Link>
        .
      </p>
    </LandingShell>
  );
}
