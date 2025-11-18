import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { InventoryResponse } from '@/types/api';

export function useInventory() {
  const { data, error, isLoading, mutate } = useSWR<InventoryResponse>(
    'inventory',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  return {
    inventory: data?.inventory || [],
    count: data?.count || 0,
    outOfStockCount: data?.outOfStockCount || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
