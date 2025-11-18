import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { DashboardResponse } from '@/types/api';

export function useDashboard() {
  const { data, error, isLoading, mutate } = useSWR<DashboardResponse>(
    'dashboard',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data?.stats,
    recentOrders: data?.recentOrders || [],
    outOfStockProducts: data?.outOfStockProducts || [],
    isLoading,
    isError: error,
    mutate,
  };
}
