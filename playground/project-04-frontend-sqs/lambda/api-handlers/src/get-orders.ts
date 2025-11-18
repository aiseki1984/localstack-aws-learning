/**
 * Get Orders Lambda
 *
 * 責務: 注文一覧を取得する
 * - DynamoDB Scanでordersテーブルを取得
 * - createdAtでソート（新しい順）
 * - ページネーション対応（最大100件）
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /orders - Fetching orders');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: ORDERS_TABLE,
        Limit: 100, // 最大100件
      })
    );

    const orders = result.Items || [];

    // createdAtで降順ソート（新しい順）
    orders.sort((a, b) => {
      const dateA = new Date(a.createdAt as string).getTime();
      const dateB = new Date(b.createdAt as string).getTime();
      return dateB - dateA;
    });

    console.log(`Found ${orders.length} orders`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        orders,
        count: orders.length,
      }),
    };
  } catch (error) {
    console.error('Error fetching orders:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch orders',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
