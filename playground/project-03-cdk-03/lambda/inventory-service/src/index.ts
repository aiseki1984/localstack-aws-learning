import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const INVENTORY_TABLE = process.env.INVENTORY_TABLE!;

interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface OrderEvent {
  eventType: string;
  order: {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    status: string;
    totalAmount: number;
    createdAt: string;
  };
  timestamp: string;
}

/**
 * Inventory Service Lambda
 * 
 * 責務: 注文イベントを受け取り、在庫をチェック・更新する
 * - 在庫が足りる場合: 在庫を減らす
 * - 在庫が不足する場合: エラーをスロー（DLQへ）
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('📦 Inventory Service: Processing messages', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const orderEvent: OrderEvent = JSON.parse(record.body);
      const { order } = orderEvent;

      console.log(`Processing order: ${order.orderId}`);

      // 各商品の在庫をチェック・更新
      for (const item of order.items) {
        await processInventory(item, order.orderId);
      }

      console.log(`✅ Successfully processed inventory for order: ${order.orderId}`);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      // エラーをスローしてメッセージをDLQに送る
      throw error;
    }
  }
};

async function processInventory(item: OrderItem, orderId: string): Promise<void> {
  const { productId, quantity } = item;

  // 現在の在庫を取得
  const getResult = await docClient.send(new GetCommand({
    TableName: INVENTORY_TABLE,
    Key: { productId }
  }));

  if (!getResult.Item) {
    throw new Error(`Product not found: ${productId}`);
  }

  const currentStock = getResult.Item.stock as number;
  const productName = getResult.Item.productName as string;

  console.log(`Product: ${productName}, Current stock: ${currentStock}, Requested: ${quantity}`);

  // 在庫チェック
  if (currentStock < quantity) {
    throw new Error(
      `Insufficient stock for ${productName}. ` +
      `Available: ${currentStock}, Requested: ${quantity}`
    );
  }

  // 在庫を減らす
  await docClient.send(new UpdateCommand({
    TableName: INVENTORY_TABLE,
    Key: { productId },
    UpdateExpression: 'SET stock = stock - :qty, lastUpdated = :timestamp, lastOrderId = :orderId',
    ExpressionAttributeValues: {
      ':qty': quantity,
      ':timestamp': new Date().toISOString(),
      ':orderId': orderId
    }
  }));

  console.log(`✅ Updated inventory for ${productName}: ${currentStock} -> ${currentStock - quantity}`);
}
