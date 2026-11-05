import { useConversations } from "./useSupport";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
export function SupportMenuBadge() {
  const t = useT().dict.support;
  const staff = useStaff()?.user;
  const allowed = !!staff && (staff.role === "admin" || !staff.permissions || staff.permissions.includes("support:manage"));
  const query = useConversations(true, "?unread=1", allowed);
  const count = query.data?.value.meta.total ?? 0;
  return count ? <span className="ml-auto rounded-full bg-accent px-2 py-1 text-xs font-bold text-accent-foreground" aria-label={`${t.unread}: ${count}`}>{count > 99 ? "99+" : count}</span> : null;
}
