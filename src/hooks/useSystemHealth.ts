import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "degraded" | "down" | "not_configured";
  latency_ms?: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthResponse {
  overall_status: "healthy" | "degraded" | "down";
  checked_at: string;
  checks: HealthCheckResult[];
}

export const useSystemHealth = (autoRefresh = true) => {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: async (): Promise<SystemHealthResponse> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("system-health-check", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Health check failed");
      }

      return response.data as SystemHealthResponse;
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 1,
  });
};
