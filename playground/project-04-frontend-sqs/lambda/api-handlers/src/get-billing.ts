/**
 * Get Billing Lambda
 *
 * 責務: 請求一覧を取得する
 * - DynamoDB Scanでbillingテーブルを取得
 * - 請求金額と請求ステータスを返す
 * - orderIdとの紐付け情報を含む
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const BILLING_TABLE = process.env.BILLING_TABLE || 'billing';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /billing - Fetching billing records');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: BILLING_TABLE,
        Limit: 100,
      })
    );

    const billingRecords = result.Items || [];

    // createdAtで降順ソート（新しい順）
    billingRecords.sort((a, b) => {
      const dateA = new Date(a.createdAt as string).getTime();
      const dateB = new Date(b.createdAt as string).getTime();
      return dateB - dateA;
    });

    // 合計金額を計算
    const totalAmount = billingRecords.reduce(
      (sum, record) => sum + (record.totalAmount as number),
      0
    );

    console.log(`Found ${billingRecords.length} billing records (Total: ¥${totalAmount})`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        billingRecords,
        count: billingRecords.length,
        totalAmount,
      }),
    };
  } catch (error) {
    console.error('Error fetching billing records:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch billing records',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
