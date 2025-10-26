import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class MyCdkProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // S3 Bucket
    const bucket = new s3.Bucket(this, 'MyCdkProjectBucket', {
      bucketName:
        'my-cdk-project-bucket-' + Math.random().toString(36).substring(2, 15),
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 学習用なので削除を許可
    });

    // SQS Queue
    const queue = new sqs.Queue(this, 'MyCdkProjectQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    // Lambda Function
    const lambdaFunction = new lambda.Function(this, 'MyCdkProjectFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Hello from CDK Lambda!');
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: 'Hello from CDK Lambda!',
              bucket: '${bucket.bucketName}',
              queue: '${queue.queueName}'
            })
          };
        };
      `),
      environment: {
        BUCKET_NAME: bucket.bucketName,
        QUEUE_URL: queue.queueUrl,
      },
    });

    // Lambda に S3 と SQS へのアクセス権限を付与
    bucket.grantReadWrite(lambdaFunction);
    queue.grantSendMessages(lambdaFunction);
  }
}
