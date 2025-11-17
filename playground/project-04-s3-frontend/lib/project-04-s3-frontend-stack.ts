import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as path from 'path';

export class Project04S3FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: 'sample-bucket',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットも削除
      autoDeleteObjects: true, // バケット内のオブジェクトも自動削除
    });

    // Next.jsのビルド成果物をS3にデプロイ
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend-nextjs/out'))],
      destinationBucket: websiteBucket,
    });

    // アクセス用URLを出力
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `http://${websiteBucket.bucketName}.s3.localhost.localstack.cloud:4566/index.html`,
      description: 'Website URL',
    });
  }
}