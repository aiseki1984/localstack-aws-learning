import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';

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
    // ⚡ Phase 2: Order Processor Lambda
    // ═══════════════════════════════════════════════════════

    const orderProcessorLambda = new lambdaNodejs.NodejsFunction(this, 'OrderProcessorLambda', {
      functionName: 'order-processor',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/order-processor/src/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        ORDERS_TABLE: ordersTable.tableName,
        TOPIC_ARN: orderEventsTopic.topicArn,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // Lambda に権限を付与
    ordersTable.grantWriteData(orderProcessorLambda);
    orderEventsTopic.grantPublish(orderProcessorLambda);

    // ═══════════════════════════════════════════════════════
    // 🌐 Phase 2: API Gateway
    // ═══════════════════════════════════════════════════════

    const api = new apigateway.RestApi(this, 'OrdersApi', {
      restApiName: 'Orders Service API',
      description: 'E-コマース注文処理API',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // /orders エンドポイント
    const ordersResource = api.root.addResource('orders');
    
    // POST /orders
    ordersResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(orderProcessorLambda, {
        proxy: true,
      })
    );

    // ═══════════════════════════════════════════════════════
    // ⚡ Phase 3: Inventory Service Lambda
    // ═══════════════════════════════════════════════════════

    const inventoryServiceLambda = new lambdaNodejs.NodejsFunction(this, 'InventoryServiceLambda', {
      functionName: 'inventory-service',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/inventory-service/src/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        INVENTORY_TABLE: inventoryTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // SQS → Lambda イベントソース設定
    inventoryServiceLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(inventoryQueue, {
        batchSize: 10, // 一度に最大10件処理
        reportBatchItemFailures: true, // 部分的な失敗を報告
      })
    );

    // Lambda に権限を付与
    inventoryTable.grantReadWriteData(inventoryServiceLambda);

    // ═══════════════════════════════════════════════════════
    // ⚡ Phase 3: Notification Service Lambda
    // ═══════════════════════════════════════════════════════

    const notificationServiceLambda = new lambdaNodejs.NodejsFunction(this, 'NotificationServiceLambda', {
      functionName: 'notification-service',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/notification-service/src/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        NOTIFICATIONS_TABLE: notificationsTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // SQS → Lambda イベントソース設定
    notificationServiceLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(notificationQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // Lambda に権限を付与
    notificationsTable.grantWriteData(notificationServiceLambda);

    // ═══════════════════════════════════════════════════════
    // ⚡ Phase 3: Billing Service Lambda
    // ═══════════════════════════════════════════════════════

    const billingServiceLambda = new lambdaNodejs.NodejsFunction(this, 'BillingServiceLambda', {
      functionName: 'billing-service',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/billing-service/src/index.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        BILLING_TABLE: billingTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });

    // SQS → Lambda イベントソース設定
    billingServiceLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(billingQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      })
    );

    // Lambda に権限を付与
    billingTable.grantWriteData(billingServiceLambda);

    // ═══════════════════════════════════════════════════════
    // 🪣 Phase 5: S3 Bucket for Frontend Hosting
    // ═══════════════════════════════════════════════════════

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: 'ecommerce-frontend',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ═══════════════════════════════════════════════════════
    // ⚡ Phase 5: GET API Lambda Functions
    // ═══════════════════════════════════════════════════════

    // 1️⃣ Get Orders Lambda
    const getOrdersLambda = new lambdaNodejs.NodejsFunction(this, 'GetOrdersLambda', {
      functionName: 'get-orders',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/api-handlers/src/get-orders.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        ORDERS_TABLE: ordersTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    ordersTable.grantReadData(getOrdersLambda);

    // 2️⃣ Get Inventory Lambda
    const getInventoryLambda = new lambdaNodejs.NodejsFunction(this, 'GetInventoryLambda', {
      functionName: 'get-inventory',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/api-handlers/src/get-inventory.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        INVENTORY_TABLE: inventoryTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    inventoryTable.grantReadData(getInventoryLambda);

    // 3️⃣ Get Notifications Lambda
    const getNotificationsLambda = new lambdaNodejs.NodejsFunction(this, 'GetNotificationsLambda', {
      functionName: 'get-notifications',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/api-handlers/src/get-notifications.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        NOTIFICATIONS_TABLE: notificationsTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    notificationsTable.grantReadData(getNotificationsLambda);

    // 4️⃣ Get Billing Lambda
    const getBillingLambda = new lambdaNodejs.NodejsFunction(this, 'GetBillingLambda', {
      functionName: 'get-billing',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/api-handlers/src/get-billing.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        BILLING_TABLE: billingTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    billingTable.grantReadData(getBillingLambda);

    // 5️⃣ Get Dashboard Lambda
    const getDashboardLambda = new lambdaNodejs.NodejsFunction(this, 'GetDashboardLambda', {
      functionName: 'get-dashboard',
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/api-handlers/src/get-dashboard.ts',
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        ORDERS_TABLE: ordersTable.tableName,
        INVENTORY_TABLE: inventoryTable.tableName,
        NOTIFICATIONS_TABLE: notificationsTable.tableName,
        BILLING_TABLE: billingTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['@aws-sdk/*'],
      },
    });
    ordersTable.grantReadData(getDashboardLambda);
    inventoryTable.grantReadData(getDashboardLambda);
    notificationsTable.grantReadData(getDashboardLambda);
    billingTable.grantReadData(getDashboardLambda);

    // ═══════════════════════════════════════════════════════
    // 🌐 Phase 5: API Gateway - GET Endpoints
    // ═══════════════════════════════════════════════════════

    // GET /orders
    ordersResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getOrdersLambda, {
        proxy: true,
      })
    );

    // GET /inventory
    const inventoryResource = api.root.addResource('inventory');
    inventoryResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getInventoryLambda, {
        proxy: true,
      })
    );

    // GET /notifications
    const notificationsResource = api.root.addResource('notifications');
    notificationsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getNotificationsLambda, {
        proxy: true,
      })
    );

    // GET /billing
    const billingResource = api.root.addResource('billing');
    billingResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getBillingLambda, {
        proxy: true,
      })
    );

    // GET /dashboard
    const dashboardResource = api.root.addResource('dashboard');
    dashboardResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getDashboardLambda, {
        proxy: true,
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

    new cdk.CfnOutput(this, 'OrderProcessorLambdaName', {
      value: orderProcessorLambda.functionName,
      description: 'Order Processor Lambda関数名',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'OrdersEndpoint', {
      value: `${api.url}orders`,
      description: '注文エンドポイント（POST）',
    });

    new cdk.CfnOutput(this, 'InventoryServiceLambdaName', {
      value: inventoryServiceLambda.functionName,
      description: 'Inventory Service Lambda関数名',
    });

    new cdk.CfnOutput(this, 'NotificationServiceLambdaName', {
      value: notificationServiceLambda.functionName,
      description: 'Notification Service Lambda関数名',
    });

    new cdk.CfnOutput(this, 'BillingServiceLambdaName', {
      value: billingServiceLambda.functionName,
      description: 'Billing Service Lambda関数名',
    });

    // Phase 5 Outputs
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'フロントエンドホスティング用S3バケット名',
    });

    new cdk.CfnOutput(this, 'FrontendBucketWebsiteUrl', {
      value: frontendBucket.bucketWebsiteUrl,
      description: 'フロントエンドURL',
    });

    new cdk.CfnOutput(this, 'GetOrdersEndpoint', {
      value: `${api.url}orders`,
      description: '注文一覧取得エンドポイント（GET）',
    });

    new cdk.CfnOutput(this, 'GetInventoryEndpoint', {
      value: `${api.url}inventory`,
      description: '在庫一覧取得エンドポイント（GET）',
    });

    new cdk.CfnOutput(this, 'GetNotificationsEndpoint', {
      value: `${api.url}notifications`,
      description: '通知一覧取得エンドポイント（GET）',
    });

    new cdk.CfnOutput(this, 'GetBillingEndpoint', {
      value: `${api.url}billing`,
      description: '請求一覧取得エンドポイント（GET）',
    });

    new cdk.CfnOutput(this, 'GetDashboardEndpoint', {
      value: `${api.url}dashboard`,
      description: 'ダッシュボード統計取得エンドポイント（GET）',
    });
  }
}
