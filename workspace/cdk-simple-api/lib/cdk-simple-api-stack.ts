import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'path';

export class CdkSimpleApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda関数の作成
    const helloLambda = new lambda.Function(this, 'HelloFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'hello.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
      },
    });

    // API Gatewayの作成
    const api = new apigateway.RestApi(this, 'SimpleApi', {
      restApiName: 'Simple Service',
      description: 'This service serves a simple API with LocalStack.',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // Lambda統合の作成
    const helloIntegration = new apigateway.LambdaIntegration(helloLambda, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API Gatewayのリソースとメソッドを作成
    // GET /hello
    const helloResource = api.root.addResource('hello');
    helloResource.addMethod('GET', helloIntegration);

    // GET / (ルート)
    api.root.addMethod('GET', helloIntegration);

    // POST /hello
    helloResource.addMethod('POST', helloIntegration);

    // 出力として API Gateway の URL を表示
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'HelloEndpoint', {
      value: `${api.url}hello`,
      description: 'Hello endpoint URL',
    });
  }
}
