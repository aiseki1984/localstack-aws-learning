/**
 * Get Inventory Lambda
 *
 * 責務: 在庫一覧を取得する
 * - DynamoDB Scanでinventoryテーブルを取得
 * - 在庫数と商品情報を返す
 * - 在庫切れ商品も含む（UI側で判定）
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const INVENTORY_TABLE = process.env.INVENTORY_TABLE || 'inventory';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /inventory - Fetching inventory');

  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: INVENTORY_TABLE,
      })
    );

    const inventory = result.Items || [];

    // 商品名でソート
    inventory.sort((a, b) => {
      const nameA = (a.productName as string).toLowerCase();
      const nameB = (b.productName as string).toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 在庫切れ商品数をカウント
    const outOfStockCount = inventory.filter(item => (item.stock as number) === 0).length;

    console.log(`Found ${inventory.length} products (${outOfStockCount} out of stock)`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        inventory,
        count: inventory.length,
        outOfStockCount,
      }),
    };
  } catch (error) {
    console.error('Error fetching inventory:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to fetch inventory',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
