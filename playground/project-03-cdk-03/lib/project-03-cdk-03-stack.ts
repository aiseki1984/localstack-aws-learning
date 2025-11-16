import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

export class Project03Cdk03Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ═══════════════════════════════════════════════════════
    // 📊 Phase 1: DynamoDB テーブル（4つのマイクロサービス用）
    // ═══════════════════════════════════════════════════════

    // 1️⃣ Orders テーブル - 注文情報
    const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'orders',
      partitionKey: {
        name: 'orderId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 2️⃣ Inventory テーブル - 在庫情報
    const inventoryTable = new dynamodb.Table(this, 'InventoryTable', {
      tableName: 'inventory',
      partitionKey: {
        name: 'productId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 3️⃣ Notifications テーブル - 通知履歴
    const notificationsTable = new dynamodb.Table(this, 'NotificationsTable', {
      tableName: 'notifications',
      partitionKey: {
        name: 'notificationId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // 4️⃣ Billing テーブル - 請求情報
    const billingTable = new dynamodb.Table(this, 'BillingTable', {
      tableName: 'billing',
      partitionKey: {
        name: 'billingId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'orderId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ═══════════════════════════════════════════════════════
    // 📢 Phase 1: SNS Topic（ファンアウトハブ）
    // ═══════════════════════════════════════════════════════

    const orderEventsTopic = new sns.Topic(this, 'OrderEventsTopic', {
      topicName: 'order-events',
      displayName: '注文イベント配信トピック',
    });

    // ═══════════════════════════════════════════════════════
    // 📬 Phase 1: SQS キュー（各マイクロサービス用 + DLQ）
    // ═══════════════════════════════════════════════════════

    // 🗑️ Dead Letter Queue（共通）
    const deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      queueName: 'order-processing-dlq',
      retentionPeriod: cdk.Duration.days(14), // エラーメッセージを14日間保持
    });

    // 📦 Inventory Service 用キュー
    const inventoryQueue = new sqs.Queue(this, 'InventoryQueue', {
      queueName: 'inventory-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3, // 3回失敗したらDLQへ
      },
    });

    // 📧 Notification Service 用キュー
    const notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: 'notification-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // 💳 Billing Service 用キュー
    const billingQueue = new sqs.Queue(this, 'BillingQueue', {
      queueName: 'billing-queue',
      visibilityTimeout: cdk.Duration.seconds(300),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    // ═══════════════════════════════════════════════════════
    // 🔗 SNS → SQS サブスクリプション（ファンアウト設定）
    // ═══════════════════════════════════════════════════════

    orderEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(inventoryQueue, {
        rawMessageDelivery: true, // JSON形式でそのまま配信
      })
    );

    orderEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(notificationQueue, {
        rawMessageDelivery: true,
      })
    );

    orderEventsTopic.addSubscription(
      new subscriptions.SqsSubscription(billingQueue, {
        rawMessageDelivery: true,
      })
    );

    // ═══════════════════════════════════════════════════════
    // 📤 CloudFormation Outputs
    // ═══════════════════════════════════════════════════════

    new cdk.CfnOutput(this, 'OrdersTableName', {
      value: ordersTable.tableName,
      description: '注文テーブル名',
    });

    new cdk.CfnOutput(this, 'InventoryTableName', {
      value: inventoryTable.tableName,
      description: '在庫テーブル名',
    });

    new cdk.CfnOutput(this, 'NotificationsTableName', {
      value: notificationsTable.tableName,
      description: '通知テーブル名',
    });

    new cdk.CfnOutput(this, 'BillingTableName', {
      value: billingTable.tableName,
      description: '請求テーブル名',
    });

    new cdk.CfnOutput(this, 'OrderEventsTopicArn', {
      value: orderEventsTopic.topicArn,
      description: 'SNSトピックARN',
    });

    new cdk.CfnOutput(this, 'InventoryQueueUrl', {
      value: inventoryQueue.queueUrl,
      description: '在庫サービスキューURL',
    });

    new cdk.CfnOutput(this, 'NotificationQueueUrl', {
      value: notificationQueue.queueUrl,
      description: '通知サービスキューURL',
    });

    new cdk.CfnOutput(this, 'BillingQueueUrl', {
      value: billingQueue.queueUrl,
      description: '請求サービスキューURL',
    });

    new cdk.CfnOutput(this, 'DeadLetterQueueUrl', {
      value: deadLetterQueue.queueUrl,
      description: 'Dead Letter Queue URL',
    });
  }
}
