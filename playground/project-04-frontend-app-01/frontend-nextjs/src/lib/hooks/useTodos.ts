import useSWR from 'swr';
import { todoApi } from '@/lib/api/todoApi';
import { useTodoStore } from '@/store/useTodoStore';

export function useTodos() {
  const optimisticTodos = useTodoStore((state) => state.optimisticTodos);
  
  const { data, error, isLoading, mutate } = useSWR(
    '/todos',
    () => todoApi.getTodos(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    todos: optimisticTodos ?? data ?? [],
    isLoading,
    isError: error,
    mutate,
  };
}
