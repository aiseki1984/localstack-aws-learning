import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class FileUploadApiCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 📦 Phase 1: API Gateway + Lambda (シンプルなJSON処理)

    // Lambda Function - JSON処理
    const jsonHandler = new lambda.Function(this, 'JsonHandler', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/upload-handler/dist'),
      environment: {
        NODE_ENV: 'development',
      },
      timeout: cdk.Duration.seconds(30),
    });

    // API Gateway - REST API
    const api = new apigateway.RestApi(this, 'FileUploadApi', {
      restApiName: 'File Upload Service',
      description: 'API for uploading files to S3',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
      },
    });

    // /process リソースの作成
    const processResource = api.root.addResource('process');

    // POST /process エンドポイント
    const jsonIntegration = new apigateway.LambdaIntegration(jsonHandler, {
      proxy: true,
    });

    processResource.addMethod('POST', jsonIntegration);

    // 📊 Output - デプロイ後に確認用
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ProcessEndpoint', {
      value: `${api.url}process`,
      description: 'JSON Process Endpoint',
    });
  }
}
