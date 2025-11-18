'use client';

import { useInventory } from '@/lib/hooks/useInventory';

export default function InventoryPage() {
  const { inventory, count, outOfStockCount, isLoading, isError } = useInventory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading inventory...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading inventory</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Inventory</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Total: {count} products ({outOfStockCount} out of stock)
        </p>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">No products in inventory</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map((item) => (
            <div
              key={item.productId}
              className={`bg-white dark:bg-zinc-900 rounded-lg shadow-sm border p-6 ${
                item.stock === 0
                  ? 'border-red-300 dark:border-red-800'
                  : item.stock <= 10
                    ? 'border-yellow-300 dark:border-yellow-800'
                    : 'border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {item.productName}
                </h3>
                {item.stock === 0 ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                    Out of Stock
                  </span>
                ) : item.stock <= 10 ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                    Low Stock
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                    In Stock
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Product ID:</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {item.productId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Price:</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    ¥{item.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Stock:</span>
                  <span
                    className={`text-sm font-bold ${
                      item.stock === 0
                        ? 'text-red-600 dark:text-red-400'
                        : item.stock <= 10
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {item.stock} units
                  </span>
                </div>
                {item.lastUpdated && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Last updated: {new Date(item.lastUpdated).toLocaleString()}
                    </p>
                    {item.lastOrderId && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Order: {item.lastOrderId.slice(0, 8)}...
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
