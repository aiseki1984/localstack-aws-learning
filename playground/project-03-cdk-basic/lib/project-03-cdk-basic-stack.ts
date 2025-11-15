import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';

export class Project03CdkBasicStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==========================================
    // DynamoDB テーブル
    // ==========================================
    const postsTable = new dynamodb.Table(this, 'PostsTable', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド課金
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にテーブルも削除（学習用）
    });

    // ==========================================
    // Lambda 関数（NodejsFunction で自動ビルド）
    // ==========================================
    const postsFunction = new lambdaNodejs.NodejsFunction(this, 'PostsFunction', {
      entry: path.join(__dirname, '../lambda/src/index.ts'), // .ts ファイルを直接指定
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        TABLE_NAME: postsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: true,              // コードを圧縮
        sourceMap: true,           // ソースマップを生成（デバッグ用）
        externalModules: [         // AWS SDK は Lambda 環境にあるので除外
          '@aws-sdk/client-dynamodb',
          '@aws-sdk/lib-dynamodb',
        ],
      },
    });

    // Lambda に DynamoDB テーブルへの読み書き権限を付与
    postsTable.grantReadWriteData(postsFunction);

    // ==========================================
    // API Gateway REST API
    // ==========================================
    const api = new apigateway.RestApi(this, 'PostsApi', {
      restApiName: 'Posts Service',
      description: 'API for managing posts',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // Lambda 統合
    const lambdaIntegration = new apigateway.LambdaIntegration(postsFunction);

    // /posts エンドポイント
    const posts = api.root.addResource('posts');
    posts.addMethod('GET', lambdaIntegration);    // 全投稿取得
    posts.addMethod('POST', lambdaIntegration);   // 新規投稿作成

    // /posts/{id} エンドポイント
    const post = posts.addResource('{id}');
    post.addMethod('GET', lambdaIntegration);     // 特定投稿取得
    post.addMethod('PUT', lambdaIntegration);     // 投稿更新
    post.addMethod('DELETE', lambdaIntegration);  // 投稿削除

    // ==========================================
    // Output - デプロイ後に表示される情報
    // ==========================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: postsTable.tableName,
      description: 'DynamoDB Table Name',
    });
  }
}
