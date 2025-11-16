import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const NOTIFICATIONS_TABLE = process.env.NOTIFICATIONS_TABLE!;

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
    customerEmail: string;
    items: OrderItem[];
    status: string;
    totalAmount: number;
    createdAt: string;
  };
  timestamp: string;
}

/**
 * Notification Service Lambda
 * 
 * 責務: 注文イベントを受け取り、顧客に通知を送る
 * - メール通知をシミュレート（実際にはSES等を使用）
 * - 通知履歴をDynamoDBに記録
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('📧 Notification Service: Processing messages', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const orderEvent: OrderEvent = JSON.parse(record.body);
      const { order } = orderEvent;

      console.log(`Processing notification for order: ${order.orderId}`);

      // 通知を送信（シミュレート）
      await sendNotification(order);

      console.log(`✅ Successfully sent notification for order: ${order.orderId}`);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      throw error;
    }
  }
};

async function sendNotification(order: OrderEvent['order']): Promise<void> {
  const notificationId = randomUUID();
  
  // メール通知をシミュレート
  const emailContent = {
    to: order.customerEmail,
    subject: `ご注文ありがとうございます（注文番号: ${order.orderId.substring(0, 8)}）`,
    body: `
      お客様の注文を受け付けました。

      注文番号: ${order.orderId}
      注文日時: ${order.createdAt}
      合計金額: ¥${order.totalAmount.toLocaleString()}

      注文内容:
      ${order.items.map(item => 
        `- ${item.productName} × ${item.quantity} = ¥${(item.price * item.quantity).toLocaleString()}`
      ).join('\n      ')}

      配送準備が整い次第、改めてご連絡いたします。
    `
  };

  console.log('📨 Simulated email:', emailContent);

  // 通知履歴をDynamoDBに記録
  await docClient.send(new PutCommand({
    TableName: NOTIFICATIONS_TABLE,
    Item: {
      notificationId,
      orderId: order.orderId,
      customerId: order.customerId,
      customerEmail: order.customerEmail,
      type: 'ORDER_CONFIRMATION',
      status: 'sent',
      content: emailContent,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }
  }));

  console.log(`✅ Notification record saved: ${notificationId}`);
}
