import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiSuccessResponse } from '@/types/api';
import type { AdminDashboardData } from '../types';

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
};

export async function getAdminDashboard(
  signal?: AbortSignal,
): Promise<AdminDashboardData> {
  const response = await apiClient.get<ApiSuccessResponse<AdminDashboardData>>(
    '/admin/dashboard',
    { signal },
  );

  return response.data;
}

export function useAdminDashboard() {
  return useQuery<AdminDashboardData>({
    queryKey: adminKeys.dashboard(),
    queryFn: ({ signal }) => getAdminDashboard(signal),
    staleTime: 30_000,
  });
}
