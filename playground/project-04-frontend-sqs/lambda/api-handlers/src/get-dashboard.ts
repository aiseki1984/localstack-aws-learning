/**
 * Get Dashboard Lambda
 *
 * 責務: ダッシュボード用統計情報を取得する
 * - 各テーブルの件数を集計
 * - 在庫切れ商品数をカウント
 * - 最新10件の注文を取得
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const INVENTORY_TABLE = process.env.INVENTORY_TABLE || 'inventory';
const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'notifications';
const BILLING_TABLE = process.env.BILLING_TABLE || 'billing';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /dashboard - Fetching dashboard statistics');

  try {
    // 並列でデータ取得
    const [ordersResult, inventoryResult, notificationsResult, billingResult] = await Promise.all([
      docClient.send(new ScanCommand({ TableName: ORDERS_TABLE })),
      docClient.send(new ScanCommand({ TableName: INVENTORY_TABLE })),
      docClient.send(new ScanCommand({ TableName: NOTIFICATIONS_TABLE })),
      docClient.send(new ScanCommand({ TableName: BILLING_TABLE })),
    ]);

    const orders = ordersResult.Items || [];
    const inventory = inventoryResult.Items || [];
    const notifications = notificationsResult.Items || [];
    const billing = billingResult.Items || [];

    // 統計情報を計算
    const stats = {
      ordersCount: orders.length,
      inventoryCount: inventory.length,
      notificationsCount: notifications.length,
      billingCount: billing.length,
      outOfStockCount: inventory.filter(item => (item.stock as number) === 0).length,
      lowStockCount: inventory.filter(
        item => (item.stock as number) > 0 && (item.stock as number) <= 10
      ).length,
    };

    // 最新10件の注文を取得（createdAtでソート）
    const recentOrders = orders
      .sort((a, b) => {
        const dateA = new Date(a.createdAt as string).getTime();
        const dateB = new Date(b.createdAt as string).getTime();
        return dateB - dateA;
      })
      .slice(0, 10);

    // 在庫切れ商品リスト
    const outOfStockProducts = inventory
      .filter(item => (item.stock as number) === 0)
      .map(item => ({
        productId: item.productId,
        productName: item.productName,
      }));

    console.log('Dashboard stats:', stats);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        stats,
        recentOrders,
        outOfStockProducts,
      }),
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch dashboard data',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
