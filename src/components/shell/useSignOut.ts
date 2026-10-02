import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { toast } from "@/stores/toast";

/** Ends the customer session (server + local), drops their cached data and goes home. */
export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async () => {
    await authApi.logout().catch(() => undefined);
    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["account"] });
    toast.info("You're signed out");
    navigate("/");
  };
}
