import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const links: { to: string; label: string; exact?: boolean }[] = [
  { to: "/landing", label: "نظرة عامة", exact: true },
  { to: "/landing/settings", label: "محتوى الأسئلة" },
  { to: "/landing/leads", label: "الطلبات" },
];

export function LandingSubnav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.to || pathname === `${link.to}/`
          : pathname === link.to || pathname.startsWith(`${link.to}/`);
        return (
          <Link
            key={link.to}
            to={link.to}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <Link
        to="/website/diagnose"
        className="rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
      >
        صفحة التشخيص الجديدة ←
      </Link>
    </div>
  );
}
