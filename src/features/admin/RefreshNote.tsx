import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { refreshAdminData, useLastAdminRefresh } from "./autoRefresh";

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${Math.floor(s / 10) * 10} s ago`;
  const m = Math.floor(s / 60);
  return `${m} min ago`;
};

/** "Updated 20 s ago · Refresh" under each admin page title (auto refresh, owner 2026-11-02). */
export function RefreshNote() {
  const client = useQueryClient();
  const last = useLastAdminRefresh();
  const [now, setNow] = useState(() => Date.now());
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span>Updates by itself · {ago(Math.max(0, now - last))}</span>
      <button
        type="button"
        onClick={async () => {
          setSpinning(true);
          await refreshAdminData(client, { force: true });
          setNow(Date.now());
          setSpinning(false);
        }}
        className="inline-flex min-h-8 items-center gap-1 rounded px-1.5 font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw className={cn("size-3.5", spinning && "animate-spin motion-reduce:animate-none")} aria-hidden="true" /> Refresh now
      </button>
    </p>
  );
}
