'use client';

import { TodoItem } from './TodoItem';
import { useTodos } from '@/lib/hooks/useTodos';

export function TodoList() {
  const { todos, isLoading, isError, mutate } = useTodos();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">
          Todoの読み込みに失敗しました
        </p>
        <button
          onClick={() => mutate()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          再試行
        </button>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Todoがありません。新しいTodoを追加してください。
        </p>
      </div>
    );
  }

  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;

  return (
    <div>
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        {completedCount} / {totalCount} 完了
      </div>
      <div className="space-y-2">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            todos={todos}
            onUpdate={() => mutate()}
          />
        ))}
      </div>
    </div>
  );
}
