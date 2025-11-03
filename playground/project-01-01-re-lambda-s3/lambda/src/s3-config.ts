import { S3Client } from '@aws-sdk/client-s3';

// S3クライアント設定（LocalStack用）
export const s3Client = new S3Client({
  endpoint: process.env.LOCALSTACK_ENDPOINT || "http://localhost:4566",
  region: process.env.AWS_REGION || "us-east-1",
  forcePathStyle: true, // LocalStackで必要
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test"
  }
});

// 設定定数
export const BUCKET_NAME = process.env.BUCKET_NAME || "my-test-bucket";
export const UPLOAD_PREFIX = "uploads/";

// ヘルパー関数
export const createS3Key = (fileName: string): string => {
  return `${UPLOAD_PREFIX}${fileName}`;
};

export const extractFileName = (s3Key: string): string => {
  return s3Key.replace(UPLOAD_PREFIX, '');
};

export const createSuccessHeaders = (): { [key: string]: string } => {
  return { 'Content-Type': 'application/json' };
};