'use client';

import { useBilling } from '@/lib/hooks/useBilling';

export default function BillingPage() {
  const { billingRecords, count, totalAmount, isLoading, isError } = useBilling();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">
          Loading billing records...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Error loading billing records</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Billing</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Total: {count} {count === 1 ? 'record' : 'records'} | Total Amount: ¥
          {totalAmount.toLocaleString()}
        </p>
      </div>

      {billingRecords.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400">No billing records yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {billingRecords.map((record) => (
            <div
              key={record.billingId}
              className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    Billing #{record.billingId.slice(0, 8)}...
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Order: {record.orderId.slice(0, 8)}...
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Customer: {record.customerEmail}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    ¥{record.totalAmount.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                      record.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100 mb-3">Items</h4>
                <div className="space-y-2 mb-4">
                  {record.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-sm bg-zinc-50 dark:bg-zinc-800/50 rounded p-2"
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {item.productName} x {item.quantity}
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        ¥{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      ¥{record.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-600 dark:text-zinc-400">Tax (10%):</span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      ¥{record.tax.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-zinc-900 dark:text-zinc-100">Total:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">
                      ¥{record.totalAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
                  Created: {new Date(record.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
