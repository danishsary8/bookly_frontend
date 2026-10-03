import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { staffAuthApi, type StaffUser } from "@/api/endpoints/staff";
import { clearSession, setSession, useSession } from "@/api/session";

/** The signed-in staff member, or null. */
export const useStaff = () => useSession<StaffUser>("staff");

export const startStaffSession = (token: { token: string; expires_at: string | null }, staff: StaffUser) =>
  setSession<StaffUser>("staff", { token: token.token, expiresAt: token.expires_at, user: staff });

/** Ends the staff session on the API (best effort) and on this device, and drops cached staff data. */
export function useStaffSignOut() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    await staffAuthApi.logout().catch(() => undefined);
    clearSession("staff");
    queryClient.removeQueries({ queryKey: ["staff"] });
  }, [queryClient]);
}
