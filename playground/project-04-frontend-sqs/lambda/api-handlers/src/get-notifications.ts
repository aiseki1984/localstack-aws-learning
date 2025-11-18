/**
 * Get Notifications Lambda
 *
 * 責務: 通知履歴を取得する
 * - DynamoDB Scanでnotificationsテーブルを取得
 * - createdAtでソート（新しい順）
 * - 送信ステータス（sent/failed）を含む
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE || 'notifications';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /notifications - Fetching notifications');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: NOTIFICATIONS_TABLE,
        Limit: 100,
      })
    );

    const notifications = result.Items || [];

    // createdAtで降順ソート（新しい順）
    notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt as string).getTime();
      const dateB = new Date(b.createdAt as string).getTime();
      return dateB - dateA;
    });

    console.log(`Found ${notifications.length} notifications`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        notifications,
        count: notifications.length,
      }),
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch notifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
