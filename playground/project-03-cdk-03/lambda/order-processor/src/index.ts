/**
 * Order Processor Lambda
 * 
 * 責務:
 * 1. 注文データのバリデーション
 * 2. 注文IDの生成とDynamoDBへの保存
 * 3. SNSへの注文イベント発行
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';

// クライアント初期化
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const snsClient = new SNSClient({});

// 環境変数
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'orders';
const TOPIC_ARN = process.env.TOPIC_ARN || '';

// 型定義
interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface OrderRequest {
  customerId: string;
  customerEmail: string;
  items: OrderItem[];
}

interface Order extends OrderRequest {
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

/**
 * 注文データのバリデーション
 */
function validateOrderRequest(body: any): { valid: boolean; error?: string } {
  if (!body.customerId || typeof body.customerId !== 'string') {
    return { valid: false, error: 'customerId is required and must be a string' };
  }

  if (!body.customerEmail || typeof body.customerEmail !== 'string') {
    return { valid: false, error: 'customerEmail is required and must be a string' };
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return { valid: false, error: 'items is required and must be a non-empty array' };
  }

  for (const item of body.items) {
    if (!item.productId || typeof item.productId !== 'string') {
      return { valid: false, error: 'Each item must have a valid productId' };
    }
    if (!item.productName || typeof item.productName !== 'string') {
      return { valid: false, error: 'Each item must have a valid productName' };
    }
    if (typeof item.quantity !== 'number' || item.quantity <= 0) {
      return { valid: false, error: 'Each item must have a valid quantity (positive number)' };
    }
    if (typeof item.price !== 'number' || item.price < 0) {
      return { valid: false, error: 'Each item must have a valid price (non-negative number)' };
    }
  }

  return { valid: true };
}

/**
 * 注文合計金額の計算
 */
function calculateTotalAmount(items: OrderItem[]): number {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

/**
 * Lambda Handler
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('受信イベント:', JSON.stringify(event, null, 2));

  try {
    // リクエストボディのパース
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const orderRequest: OrderRequest = JSON.parse(event.body);

    // バリデーション
    const validation = validateOrderRequest(orderRequest);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: validation.error }),
      };
    }

    // 注文オブジェクトの作成
    const orderId = randomUUID();
    const createdAt = new Date().toISOString();
    const totalAmount = calculateTotalAmount(orderRequest.items);

    const order: Order = {
      orderId,
      customerId: orderRequest.customerId,
      customerEmail: orderRequest.customerEmail,
      items: orderRequest.items,
      status: 'pending',
      totalAmount,
      createdAt,
    };

    console.log('注文作成:', JSON.stringify(order, null, 2));

    // DynamoDBに保存
    await docClient.send(
      new PutCommand({
        TableName: ORDERS_TABLE,
        Item: order,
      })
    );

    console.log(`注文をDynamoDBに保存しました: ${orderId}`);

    // SNSにイベントを発行（ファンアウト）
    const snsMessage = {
      eventType: 'ORDER_CREATED',
      order,
      timestamp: createdAt,
    };

    await snsClient.send(
      new PublishCommand({
        TopicArn: TOPIC_ARN,
        Message: JSON.stringify(snsMessage),
        Subject: 'New Order Created',
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'ORDER_CREATED',
          },
          orderId: {
            DataType: 'String',
            StringValue: orderId,
          },
        },
      })
    );

    console.log(`SNSにイベントを発行しました: ${TOPIC_ARN}`);

    // 成功レスポンス
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // CORS対応
      },
      body: JSON.stringify({
        message: 'Order created successfully',
        orderId,
        status: 'pending',
        totalAmount,
        createdAt,
      }),
    };
  } catch (error) {
    console.error('エラー発生:', error);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
