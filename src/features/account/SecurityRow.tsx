import type { ReactNode } from "react";

/** One way into the account on Sign-in & security: icon, label, value with its status, an action, details below. */
export function Row({ icon, label, value, status, action, children }: { icon: ReactNode; label: string; value: ReactNode; status?: ReactNode; action?: ReactNode; children?: ReactNode }) {
  return (
    <li className="grid gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lapis-tint text-primary">{icon}</span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
          <span className="flex flex-wrap items-center gap-2 break-all text-[15px] text-foreground">
            {value}
            {status}
          </span>
        </div>
        {action}
      </div>
      {children}
    </li>
  );
}
