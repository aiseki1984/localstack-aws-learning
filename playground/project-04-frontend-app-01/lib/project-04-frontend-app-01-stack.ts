import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class Project04FrontendApp01Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Step 1-1: DynamoDB テーブル作成
    // ========================================
    const todoTable = new dynamodb.Table(this, 'TodoTable', {
      tableName: 'TodoTable',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 開発環境用
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // オンデマンド課金
    });

    // ========================================
    // Step 1-2: Lambda 関数作成
    // ========================================
    const lambdaEnvironment = {
      TABLE_NAME: todoTable.tableName,
      // LocalStackの場合、Lambda内からはhost.docker.internalを使用
      // 本番環境ではこの環境変数は不要（削除する）
      // AWS_ENDPOINT_URL: 'http://localhost:4566',
    };

    const getTodosFunction = new lambda.Function(this, 'GetTodosFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'getTodos.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/todos')),
      environment: lambdaEnvironment,
    });

    const createTodoFunction = new lambda.Function(this, 'CreateTodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'createTodo.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/todos')),
      environment: lambdaEnvironment,
    });

    const updateTodoFunction = new lambda.Function(this, 'UpdateTodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'updateTodo.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/todos')),
      environment: lambdaEnvironment,
    });

    const deleteTodoFunction = new lambda.Function(this, 'DeleteTodoFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'deleteTodo.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/todos')),
      environment: lambdaEnvironment,
    });

    // Lambda に DynamoDB へのアクセス権限を付与
    todoTable.grantReadData(getTodosFunction);
    todoTable.grantWriteData(createTodoFunction);
    todoTable.grantWriteData(updateTodoFunction);
    todoTable.grantWriteData(deleteTodoFunction);

    // ========================================
    // Step 1-3: API Gateway 作成
    // ========================================
    const api = new apigateway.RestApi(this, 'TodoApi', {
      restApiName: 'Todo API',
      description: 'API for Todo application',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // /todos リソース
    const todos = api.root.addResource('todos');
    todos.addMethod('GET', new apigateway.LambdaIntegration(getTodosFunction));
    todos.addMethod('POST', new apigateway.LambdaIntegration(createTodoFunction));

    // /todos/{id} リソース
    const todo = todos.addResource('{id}');
    todo.addMethod('PUT', new apigateway.LambdaIntegration(updateTodoFunction));
    todo.addMethod('DELETE', new apigateway.LambdaIntegration(deleteTodoFunction));

    // ========================================
    // Step 1-4: S3 バケット作成
    // ========================================
    const websiteBucket = new s3.Bucket(this, 'TodoAppBucket', {
      bucketName: 'todo-app-bucket',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // BucketDeployment (LocalStackでは動作しないため、手動でs3 syncが必要)
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend-nextjs/out'))],
      destinationBucket: websiteBucket,
      prune: true,
      memoryLimit: 512,
    });

    // ========================================
    // Outputs
    // ========================================
    new cdk.CfnOutput(this, 'TodoTableName', {
      value: todoTable.tableName,
      description: 'DynamoDB Table Name',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `http://${websiteBucket.bucketName}.s3.localhost.localstack.cloud:4566/index.html`,
      description: 'Website URL',
    });
  }
}
