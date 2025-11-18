'use client';

import { useState } from 'react';
import { Todo } from '@/types/api';

interface TodoItemProps {
  todo: Todo;
  onUpdate: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TodoItem({ todo, onUpdate, onDelete }: TodoItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleToggle = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(todo.id, !todo.completed);
    } catch (error) {
      console.error('Failed to update todo:', error);
      alert('Todoの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このTodoを削除しますか？')) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(todo.id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      alert('Todoの削除に失敗しました');
      setIsDeleting(false);
    }
  };

  return (
    <div
      data-testid={`todo-item-${todo.id}`}
      className={`flex items-center gap-3 p-4 border rounded-lg transition-all ${
        isDeleting ? 'opacity-50' : ''
      } ${
        todo.completed
          ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
      }`}
    >
      <input
        data-testid={`todo-checkbox-${todo.id}`}
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        disabled={isUpdating || isDeleting}
        className="w-5 h-5 text-blue-500 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <p
          data-testid={`todo-title-${todo.id}`}
          className={`text-sm font-medium ${
            todo.completed
              ? 'line-through text-gray-500 dark:text-gray-400'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {todo.title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          作成: {new Date(todo.createdAt).toLocaleString('ja-JP')}
        </p>
      </div>
      <button
        data-testid={`todo-delete-${todo.id}`}
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
      >
        {isDeleting ? '削除中...' : '削除'}
      </button>
    </div>
  );
}
