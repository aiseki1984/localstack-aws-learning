import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { NotificationsResponse } from '@/types/api';

export function useNotifications() {
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    'notifications',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  return {
    notifications: data?.notifications || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
