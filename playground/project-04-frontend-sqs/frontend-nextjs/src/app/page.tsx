'use client';

import { useDashboard } from '@/lib/hooks/useDashboard';
import Link from 'next/link';

export default function Dashboard() {
  const { stats, recentOrders, outOfStockProducts, isLoading, isError } = useDashboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading dashboard data</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          E-Commerce Order Processing System Overview
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Orders"
          value={stats?.ordersCount || 0}
          icon="📦"
          href="/orders"
        />
        <StatCard
          title="Inventory Items"
          value={stats?.inventoryCount || 0}
          icon="📋"
          href="/inventory"
        />
        <StatCard
          title="Notifications"
          value={stats?.notificationsCount || 0}
          icon="📧"
          href="/notifications"
        />
        <StatCard
          title="Billing Records"
          value={stats?.billingCount || 0}
          icon="💳"
          href="/billing"
        />
      </div>

      {/* Alerts */}
      {stats && (stats.outOfStockCount > 0 || stats.lowStockCount > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Inventory Alerts
          </h3>
          <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
            {stats.outOfStockCount > 0 && (
              <p>⚠️ {stats.outOfStockCount} products are out of stock</p>
            )}
            {stats.lowStockCount > 0 && (
              <p>📉 {stats.lowStockCount} products have low stock (≤10 units)</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Recent Orders
          </h2>
          {recentOrders.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="border-b border-zinc-200 dark:border-zinc-800 pb-4 last:border-0"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        Order #{order.orderId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {order.customerEmail}
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        ¥{order.totalAmount.toLocaleString()}
                      </p>
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {order.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Out of Stock Products */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Out of Stock Products
          </h2>
          {outOfStockProducts.length === 0 ? (
            <p className="text-zinc-600 dark:text-zinc-400">All products in stock!</p>
          ) : (
            <div className="space-y-2">
              {outOfStockProducts.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                >
                  <span className="font-medium text-red-900 dark:text-red-300">
                    {product.productName}
                  </span>
                  <span className="text-sm text-red-700 dark:text-red-400">
                    Out of Stock
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: string;
  href: string;
}

function StatCard({ title, value, icon, href }: StatCardProps) {
  return (
    <Link href={href}>
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {value}
            </p>
          </div>
          <div className="text-4xl">{icon}</div>
        </div>
      </div>
    </Link>
  );
}
