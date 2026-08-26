import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, KanbanSquare, Timer, Wallet } from "lucide-react";

import { SamaaLogo } from "@/components/brand/SamaaLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { sprintUiLabels } from "@/lib/samaa";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Samaa Dev — نظام إدارة المشاريع والحسابات" },
      {
        name: "description",
        content:
          "نظام Samaa Dev الداخلي لإدارة المشاريع، المهام، الدورات، العملاء والحسابات المالية في مكان واحد.",
      },
      { property: "og:title", content: "Samaa Dev — نظام إدارة المشاريع والحسابات" },
      {
        property: "og:description",
        content: "إدارة المشاريع والمهام والدورات والمالية لوكالة Samaa Dev.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: KanbanSquare, title: "لوحات كانبان", text: "تتبع المهام من التنفيذ إلى مراجعة الكود والتسليم." },
  { icon: Timer, title: sprintUiLabels.agileFeature, text: sprintUiLabels.agileFeatureText },
  { icon: Wallet, title: "حسابات ومالية", text: "الإيرادات والمصروفات وصافي الربح والدفعات المتأخرة." },
  { icon: BarChart3, title: "مؤشرات أداء", text: "صحة المشاريع، الميزانية مقابل الإنفاق، والالتزام بالمواعيد." },
];

function Landing() {
  return (
    <div className="grid-glow min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <SamaaLogo className="h-10 w-10" />
          <span className="text-lg font-bold">
            Samaa <span className="text-primary">Dev</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild>
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:pt-20">
        <p className="text-xs font-semibold tracking-[0.3em] text-primary">INTERNAL SYSTEM</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          نظام إدارة <span className="brand-gradient-text">Samaa Dev</span> لكل ما يجري داخل الوكالة
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
          مشاريع، عملاء، دورات، مهام، ومؤشرات مالية دقيقة — بواجهة واحدة مخصصة لفريق التطوير.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">الدخول بحساب Google</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="panel p-5">
              <span className="inline-flex rounded-xl bg-primary/15 p-2.5 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
