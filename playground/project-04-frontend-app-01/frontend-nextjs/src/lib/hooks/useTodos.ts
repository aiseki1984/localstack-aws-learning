import useSWR from 'swr';
import { todoApi } from '@/lib/api/todoApi';
import { Todo } from '@/types/api';

export function useTodos() {
  const { data, error, isLoading, mutate } = useSWR(
    '/todos',
    () => todoApi.getTodos(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // 楽観的更新でTodoを更新
  const updateTodoOptimistic = async (id: string, completed: boolean) => {
    const currentTodos = data ?? [];
    
    // 楽観的更新: ローカルキャッシュを即座に更新（再検証しない）
    await mutate(
      currentTodos.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo
      ),
      {
        revalidate: false, // サーバーに問い合わせない
      }
    );

    try {
      // APIを呼ぶ
      await todoApi.updateTodo(id, { completed });
      // 成功したらサーバーから最新データを取得
      await mutate();
    } catch (error) {
      // エラー時は元に戻す
      await mutate(currentTodos, { revalidate: false });
      throw error;
    }
  };

  // 楽観的更新でTodoを削除
  const deleteTodoOptimistic = async (id: string) => {
    const currentTodos = data ?? [];
    
    // 楽観的更新: ローカルキャッシュから即座に削除
    await mutate(
      currentTodos.filter((todo) => todo.id !== id),
      {
        revalidate: false,
      }
    );

    try {
      await todoApi.deleteTodo(id);
      await mutate();
    } catch (error) {
      // エラー時は元に戻す
      await mutate(currentTodos, { revalidate: false });
      throw error;
    }
  };

  // Todoを作成
  const createTodo = async (title: string) => {
    const newTodo = await todoApi.createTodo({ title });
    // 作成後は単純に再取得
    await mutate();
    return newTodo;
  };

  return {
    todos: data ?? [],
    isLoading,
    isError: error,
    updateTodoOptimistic,
    deleteTodoOptimistic,
    createTodo,
  };
}
