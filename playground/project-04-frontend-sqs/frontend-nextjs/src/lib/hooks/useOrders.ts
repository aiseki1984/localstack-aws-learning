import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { OrdersResponse } from '@/types/api';

export function useOrders() {
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    'orders',
    fetcher,
    {
      refreshInterval: 5000, // 5秒ごとに自動リフレッシュ
      revalidateOnFocus: true,
    }
  );

  return {
    orders: data?.orders || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
