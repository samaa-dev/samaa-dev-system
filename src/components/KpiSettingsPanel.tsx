import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getDb, getFirebaseAuth } from "@/integrations/firebase/client";
import type { KpiWidgetConfig } from "@/integrations/firebase/types";
import { nowIso, withFirebaseError } from "@/integrations/firebase/helpers";
import { doc, setDoc } from "firebase/firestore";
import { kpiSettingsQuery } from "@/lib/data";
import { defaultKpiSettings, KPI_CATALOG, mergeKpiSettings, type KpiSettings } from "@/lib/kpis";

export function KpiSettingsPanel() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: saved } = useQuery(kpiSettingsQuery());
  const [widgets, setWidgets] = useState<KpiWidgetConfig[]>(defaultKpiSettings().widgets);

  useEffect(() => {
    if (open) setWidgets(mergeKpiSettings(saved ?? undefined));
  }, [open, saved]);

  const save = useMutation({
    mutationFn: async () =>
      withFirebaseError(async () => {
        const payload: KpiSettings = {
          updated_at: nowIso(),
          updated_by: getFirebaseAuth().currentUser?.uid ?? null,
          widgets: widgets.map((w, i) => ({ ...w, order: i })),
        };
        await setDoc(doc(getDb(), "settings", "kpis"), payload);
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-settings"] });
      toast.success("تم حفظ إعدادات المؤشرات");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateWidget = (id: string, patch: Partial<KpiWidgetConfig>) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= widgets.length) return;
    const copy = [...widgets];
    [copy[index], copy[next]] = [copy[next]!, copy[index]!];
    setWidgets(copy);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="h-4 w-4" />
          ضبط المؤشرات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ضبط مؤشرات الأداء</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {widgets.map((w, i) => {
            const catalog = KPI_CATALOG.find((c) => c.id === w.id);
            if (!catalog) return null;
            return (
              <div key={w.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={w.enabled} onCheckedChange={(v) => updateWidget(w.id, { enabled: v })} />
                    <span className="text-sm font-medium">{catalog.defaultLabel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => move(i, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={i === widgets.length - 1} onClick={() => move(i, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label className="text-xs">تسمية مخصصة</Label>
                    <Input
                      value={w.label ?? ""}
                      placeholder={catalog.defaultLabel}
                      onChange={(e) => updateWidget(w.id, { label: e.target.value || undefined })}
                    />
                  </div>
                  {catalog.supportsTarget ? (
                    <div className="grid gap-1">
                      <Label className="text-xs">هدف رقمي</Label>
                      <Input
                        type="number"
                        value={w.target ?? ""}
                        onChange={(e) =>
                          updateWidget(w.id, { target: e.target.value ? Number(e.target.value) : null })
                        }
                      />
                    </div>
                  ) : null}
                  {catalog.manualOnly ? (
                    <div className="grid gap-1 sm:col-span-2">
                      <Label className="text-xs">قيمة يدوية</Label>
                      <Input
                        type="number"
                        value={w.manual_value ?? ""}
                        onChange={(e) =>
                          updateWidget(w.id, { manual_value: e.target.value ? Number(e.target.value) : null })
                        }
                      />
                    </div>
                  ) : null}
                  {catalog.supportsTarget ? (
                    <div className="flex items-center justify-between sm:col-span-2">
                      <Label className="text-xs">شريط التقدّم نحو الهدف</Label>
                      <Switch
                        checked={w.show_target_bar ?? true}
                        onCheckedChange={(v) => updateWidget(w.id, { show_target_bar: v })}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
