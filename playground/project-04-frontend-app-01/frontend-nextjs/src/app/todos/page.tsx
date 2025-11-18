'use client';

import { TodoForm } from '@/components/TodoForm';
import { TodoList } from '@/components/TodoList';

export default function TodosPage() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Todo App
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            CDK + API Gateway + Lambda + DynamoDB + Next.js
          </p>
        </header>

        <TodoForm />
        <TodoList />
      </div>
    </div>
  );
}
