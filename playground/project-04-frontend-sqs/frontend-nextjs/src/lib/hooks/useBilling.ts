import useSWR from 'swr';
import { fetcher } from '@/lib/fetcher';
import type { BillingResponse } from '@/types/api';

export function useBilling() {
  const { data, error, isLoading, mutate } = useSWR<BillingResponse>(
    'billing',
    fetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    }
  );

  return {
    billingRecords: data?.billingRecords || [],
    count: data?.count || 0,
    totalAmount: data?.totalAmount || 0,
    isLoading,
    isError: error,
    mutate,
  };
}
