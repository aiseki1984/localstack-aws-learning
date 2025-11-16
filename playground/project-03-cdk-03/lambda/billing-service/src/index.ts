import { SQSEvent, SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const BILLING_TABLE = process.env.BILLING_TABLE!;

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
 * Billing Service Lambda
 * 
 * 責務: 注文イベントを受け取り、請求レコードを作成する
 * - 請求金額の計算（税込み）
 * - 請求履歴をDynamoDBに記録
 * - 実際には決済ゲートウェイ（Stripe等）との連携も考えられる
 */
export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('💳 Billing Service: Processing messages', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    try {
      const orderEvent: OrderEvent = JSON.parse(record.body);
      const { order } = orderEvent;

      console.log(`Processing billing for order: ${order.orderId}`);

      // 請求レコードを作成
      await createBillingRecord(order);

      console.log(`✅ Successfully created billing record for order: ${order.orderId}`);
    } catch (error) {
      console.error('❌ Error processing message:', error);
      throw error;
    }
  }
};

async function createBillingRecord(order: OrderEvent['order']): Promise<void> {
  const billingId = randomUUID();
  
  // 税込み金額を計算（消費税10%）
  const TAX_RATE = 0.10;
  const subtotal = order.totalAmount;
  const tax = Math.floor(subtotal * TAX_RATE);
  const total = subtotal + tax;

  // 商品明細を整形
  const itemBreakdown = order.items.map(item => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.price * item.quantity
  }));

  console.log(`💰 Billing calculation:
    Subtotal: ¥${subtotal.toLocaleString()}
    Tax (10%): ¥${tax.toLocaleString()}
    Total: ¥${total.toLocaleString()}
  `);

  // 請求レコードをDynamoDBに記録
  await docClient.send(new PutCommand({
    TableName: BILLING_TABLE,
    Item: {
      billingId,
      orderId: order.orderId,
      customerId: order.customerId,
      subtotal,
      tax,
      total,
      taxRate: TAX_RATE,
      items: itemBreakdown,
      status: 'pending',
      paymentMethod: null, // 決済方法（未設定）
      paidAt: null,
      createdAt: new Date().toISOString()
    }
  }));

  console.log(`✅ Billing record saved: ${billingId}`);
}
