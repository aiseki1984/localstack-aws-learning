'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInventory } from '@/lib/hooks/useInventory';
import { poster } from '@/lib/fetcher';
import type { CreateOrderRequest, CreateOrderResponse } from '@/types/api';

// Zodバリデーションスキーマ
const orderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  customerEmail: z.string().email('Invalid email address'),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product is required'),
        productName: z.string().min(1),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        price: z.number().min(0),
      })
    )
    .min(1, 'At least one item is required'),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function NewOrderPage() {
  const router = useRouter();
  const { inventory, isLoading: inventoryLoading } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: '',
      customerEmail: '',
      items: [{ productId: '', productName: '', quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items');

  // ダミーデータを入力する関数
  const fillDummyData = () => {
    // ランダムなカスタマーIDを生成
    const customerId = `customer-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    // 在庫のある商品からランダムに選択
    const availableProducts = inventory.filter((p) => p.stock > 0);

    if (availableProducts.length === 0) {
      alert('No products available in stock');
      return;
    }

    // 1-3個のランダムな商品を選択
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = availableProducts
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(numItems, availableProducts.length));

    // 選択した商品からアイテムを作成
    const newItems = selectedProducts.map((product) => {
      const quantity = Math.floor(Math.random() * Math.min(3, product.stock)) + 1;
      return {
        productId: product.productId,
        productName: product.productName,
        quantity,
        price: product.price,
      };
    });

    // resetを使って一度に全てのフォームデータを更新（再レンダリングは1回だけ）
    reset({
      customerId,
      customerEmail: `${customerId}@example.com`,
      items: newItems,
    });
  };

  // 合計金額を計算
  const calculateTotal = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const onSubmit = async (data: OrderFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const orderData: CreateOrderRequest = {
        customerId: data.customerId,
        customerEmail: data.customerEmail,
        items: data.items,
      };

      await poster<CreateOrderResponse, CreateOrderRequest>('orders', orderData);

      // 成功したら注文一覧ページにリダイレクト
      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (inventoryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Create New Order
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Fill in the order details below
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={fillDummyData}
            className="px-4 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30"
          >
            Fill Dummy Data
          </button>
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Customer Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Customer ID
              </label>
              <input
                {...register('customerId')}
                type="text"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="customer-001"
              />
              {errors.customerId && (
                <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Email Address
              </label>
              <input
                {...register('customerEmail')}
                type="email"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="customer@example.com"
              />
              {errors.customerEmail && (
                <p className="mt-1 text-sm text-red-600">{errors.customerEmail.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Order Items
            </h2>
            <button
              type="button"
              onClick={() =>
                append({ productId: '', productName: '', quantity: 1, price: 0 })
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = inventory.find(
                (p) => p.productId === items[index]?.productId
              );

              return (
                <div
                  key={field.id}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Item {index + 1}
                    </h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Product
                      </label>
                      <select
                        {...register(`items.${index}.productId`, {
                          onChange: (e) => {
                            const product = inventory.find(
                              (p) => p.productId === e.target.value
                            );
                            if (product) {
                              register(`items.${index}.productName`).onChange({
                                target: { value: product.productName },
                              });
                              register(`items.${index}.price`).onChange({
                                target: { value: product.price },
                              });
                            }
                          },
                        })}
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select a product</option>
                        {inventory.map((product) => (
                          <option
                            key={product.productId}
                            value={product.productId}
                            disabled={product.stock === 0}
                          >
                            {product.productName} - ¥{product.price.toLocaleString()} (
                            {product.stock} in stock)
                          </option>
                        ))}
                      </select>
                      {errors.items?.[index]?.productId && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.items[index]?.productId?.message}
                        </p>
                      )}
                      {selectedProduct && selectedProduct.stock < items[index]?.quantity && (
                        <p className="mt-1 text-sm text-red-600">
                          Insufficient stock! Available: {selectedProduct.stock}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Quantity
                      </label>
                      <input
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.items?.[index]?.quantity && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.items[index]?.quantity?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Hidden fields for productName and price */}
                  <input type="hidden" {...register(`items.${index}.productName`)} />
                  <input
                    type="hidden"
                    {...register(`items.${index}.price`, { valueAsNumber: true })}
                  />

                  {selectedProduct && (
                    <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                      Subtotal: ¥
                      {(items[index]?.price * items[index]?.quantity).toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {errors.items && (
            <p className="mt-2 text-sm text-red-600">{errors.items.message}</p>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Order Summary
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Subtotal:</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ¥{calculateTotal().toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Tax (10%):</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                ¥{Math.floor(calculateTotal() * 0.1).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-900 dark:text-zinc-100">Total:</span>
              <span className="text-zinc-900 dark:text-zinc-100">
                ¥{Math.floor(calculateTotal() * 1.1).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Creating Order...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
