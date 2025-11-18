import { create } from 'zustand';
import { Todo } from '@/types/api';
import { todoApi } from '@/lib/api/todoApi';

interface TodoStore {
  // 楽観的更新用のローカル状態
  optimisticTodos: Todo[] | null;
  
  // アクション
  setOptimisticTodos: (todos: Todo[] | null) => void;
  
  // Todoの作成（楽観的更新）
  createTodoOptimistic: (title: string, onSuccess?: (todo: Todo) => void) => Promise<void>;
  
  // Todoの更新（楽観的更新）
  updateTodoOptimistic: (id: string, completed: boolean, currentTodos: Todo[], onSuccess?: () => void) => Promise<void>;
  
  // Todoの削除（楽観的更新）
  deleteTodoOptimistic: (id: string, currentTodos: Todo[], onSuccess?: () => void) => Promise<void>;
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  optimisticTodos: null,
  
  setOptimisticTodos: (todos) => set({ optimisticTodos: todos }),
  
  createTodoOptimistic: async (title, onSuccess) => {
    try {
      const newTodo = await todoApi.createTodo({ title });
      onSuccess?.(newTodo);
    } catch (error) {
      console.error('Failed to create todo:', error);
      throw error;
    }
  },
  
  updateTodoOptimistic: async (id, completed, currentTodos, onSuccess) => {
    // 楽観的更新: UIを即座に更新
    const optimisticTodos = currentTodos.map((todo) =>
      todo.id === id ? { ...todo, completed } : todo
    );
    set({ optimisticTodos });
    
    try {
      await todoApi.updateTodo(id, { completed });
      set({ optimisticTodos: null }); // 成功したらoptimistic状態をクリア
      onSuccess?.();
    } catch (error) {
      console.error('Failed to update todo:', error);
      set({ optimisticTodos: null }); // エラー時は元に戻す
      throw error;
    }
  },
  
  deleteTodoOptimistic: async (id, currentTodos, onSuccess) => {
    // 楽観的更新: UIから即座に削除
    const optimisticTodos = currentTodos.filter((todo) => todo.id !== id);
    set({ optimisticTodos });
    
    try {
      await todoApi.deleteTodo(id);
      set({ optimisticTodos: null }); // 成功したらoptimistic状態をクリア
      onSuccess?.();
    } catch (error) {
      console.error('Failed to delete todo:', error);
      set({ optimisticTodos: null }); // エラー時は元に戻す
      throw error;
    }
  },
}));
