"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { Post, User } from "@/types/api";
import { useState } from "react";

export default function Posts() {
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const {
    data: posts,
    error: postsError,
    isLoading: postsLoading,
  } = useSWR<Post[]>("/posts", fetcher);

  const { data: users, error: usersError } = useSWR<User[]>("/users", fetcher);

  const { data: userPosts } = useSWR<Post[]>(
    selectedUserId ? `/users/${selectedUserId}/posts` : null,
    fetcher,
  );

  if (postsError || usersError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            データの取得に失敗しました。
          </p>
        </div>
      </div>
    );
  }

  if (postsLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      </div>
    );
  }

  const displayPosts = selectedUserId ? userPosts : posts;
  const selectedUser = users?.find((u) => u.id === selectedUserId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Posts</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          JSONPlaceholder APIからデータを取得して表示しています。
        </p>

        {/* User Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => setSelectedUserId(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedUserId === null
                ? "bg-blue-600 dark:bg-blue-500 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
            }`}
          >
            All Users
          </button>
          {users?.slice(0, 5).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelectedUserId(user.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedUserId === user.id
                  ? "bg-blue-600 dark:bg-blue-500 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer"
              }`}
            >
              {user.name}
            </button>
          ))}
        </div>

        {selectedUser && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              {selectedUser.name} (@{selectedUser.username})
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {selectedUser.email} • {selectedUser.company.name}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              {selectedUser.company.catchPhrase}
            </p>
          </div>
        )}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {displayPosts?.map((post) => {
          const author = users?.find((u) => u.id === post.userId);
          return (
            <article
              key={post.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 hover:shadow-lg dark:hover:shadow-zinc-900/50 transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex-1">
                  {post.title}
                </h2>
                <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-1 rounded-full ml-4">
                  #{post.id}
                </span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                {post.body}
              </p>
              {author && (
                <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {author.name}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{author.email}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {displayPosts && displayPosts.length === 0 && (
        <div className="text-center py-12 text-zinc-500 dark:text-zinc-500">
          投稿がありません
        </div>
      )}
    </div>
  );
}
