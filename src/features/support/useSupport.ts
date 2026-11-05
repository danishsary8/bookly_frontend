import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supportApi, type Conditional, type Conversation } from "@/api/endpoints/support";
import type { Paginated, Resource } from "@/api/types";
import { useSession } from "@/api/session";
import { isVerified } from "@/features/auth/verification";
import type { Customer } from "@/api/types";
export function useConversations(staff = false, filters = "", active = true) {
  const session = useSession<{ id: number }>(staff ? "staff" : "customer");
  const client = useQueryClient();
  const key = ["support", staff ? "staff" : "customer", session?.user.id, "list", filters];
  return useQuery({ queryKey: key, enabled: !!session && (staff || isVerified(session.user as Customer)) && active, queryFn: () => supportApi.list(staff, filters, client.getQueryData<Conditional<Paginated<Conversation>>>(key)), refetchInterval: staff ? false : 30_000, refetchIntervalInBackground: false });
}
export function useConversation(id: number, staff = false) {
  const session = useSession<{ id: number }>(staff ? "staff" : "customer");
  const client = useQueryClient();
  const key = ["support", staff ? "staff" : "customer", session?.user.id, "conversation", id];
  return useQuery({ queryKey: key, enabled: !!session && id > 0, queryFn: () => supportApi.show(id, staff, client.getQueryData<Conditional<Resource<Conversation>>>(key)), refetchInterval: 5_000, refetchIntervalInBackground: false });
}
