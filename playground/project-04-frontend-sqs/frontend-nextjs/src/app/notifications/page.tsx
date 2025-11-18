'use client';

import { useNotifications } from '@/lib/hooks/useNotifications';

export default function NotificationsPage() {
  const { notifications, count, isLoading, isError } = useNotifications();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">
          Loading notifications...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading notifications</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Notifications</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Total: {count} {count === 1 ? 'notification' : 'notifications'}
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.notificationId}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Order #{notification.orderId.slice(0, 8)}...
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        notification.status === 'sent'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}
                    >
                      {notification.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    To: {notification.customerEmail}
                  </p>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {notification.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
