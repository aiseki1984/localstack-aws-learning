import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import * as AWS from 'aws-sdk';

// S3 設定
const s3 = new AWS.S3({
  endpoint: process.env.LOCALSTACK_ENDPOINT,
  s3ForcePathStyle: true,
  accessKeyId: 'test',
  secretAccessKey: 'test',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'lambda-s3-practice';

interface S3OperationResult {
  success: boolean;
  data?: any;
  error?: string;
}

interface LambdaResponse {
  success: boolean;
  message: string;
  data?: any;
  language: string;
  timestamp: string;
}

/**
 * S3ファイルアップロード
 */
async function uploadFile(
  key: string,
  content: string,
  metadata: Record<string, string> = {}
): Promise<S3OperationResult> {
  try {
    const params: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
      Metadata: metadata,
    };

    const result = await s3.putObject(params).promise();

    return {
      success: true,
      data: {
        key,
        etag: result.ETag,
        size: Buffer.byteLength(content, 'utf8'),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * S3ファイル読み込み
 */
async function readFile(key: string): Promise<S3OperationResult> {
  try {
    const params: AWS.S3.GetObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const result = await s3.getObject(params).promise();

    return {
      success: true,
      data: {
        key,
        content: result.Body?.toString('utf-8'),
        metadata: result.Metadata,
        contentType: result.ContentType,
        lastModified: result.LastModified,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * S3ファイル更新
 */
async function updateFile(
  key: string,
  newContent: string,
  metadata: Record<string, string> = {}
): Promise<S3OperationResult> {
  try {
    // 既存ファイルのメタデータを取得
    const headParams: AWS.S3.HeadObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const existingObject = await s3.headObject(headParams).promise();
    const updatedMetadata = { ...existingObject.Metadata, ...metadata };

    // ファイルを更新
    const putParams: AWS.S3.PutObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: newContent,
      ContentType: 'text/plain',
      Metadata: updatedMetadata,
    };

    const result = await s3.putObject(putParams).promise();

    return {
      success: true,
      data: {
        key,
        etag: result.ETag,
        size: Buffer.byteLength(newContent, 'utf8'),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * S3ファイル一覧取得
 */
async function listFiles(prefix: string = ''): Promise<S3OperationResult> {
  try {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    };

    const result = await s3.listObjectsV2(params).promise();

    const files =
      result.Contents?.map((obj) => ({
        key: obj.Key,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag,
      })) || [];

    return {
      success: true,
      data: {
        folder: prefix,
        count: files.length,
        files,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * S3ファイル削除
 */
async function deleteFile(key: string): Promise<S3OperationResult> {
  try {
    const params: AWS.S3.DeleteObjectRequest = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();

    return {
      success: true,
      data: { key },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 包括的なS3操作テスト
 */
async function runComprehensiveTest(): Promise<{
  results: any;
  testsPassed: number;
}> {
  const timestamp = Date.now();
  const testKey = `typescript-files/test-${timestamp}.txt`;
  const results: any = {};
  let testsPassed = 0;

  try {
    // 1. ファイルアップロードテスト
    console.log('Testing upload...');
    const uploadResult = await uploadFile(
      testKey,
      `Hello from TypeScript Lambda!\nTest created at: ${new Date().toISOString()}`,
      {
        'upload-time': new Date().toISOString(),
        language: 'typescript',
      }
    );
    results.upload = uploadResult.data;
    if (uploadResult.success) testsPassed++;

    // 2. ファイル読み込みテスト
    console.log('Testing read...');
    const readResult = await readFile(testKey);
    results.read = readResult.data;
    if (readResult.success) testsPassed++;

    // 3. ファイル更新テスト
    console.log('Testing update...');
    const updateResult = await updateFile(
      testKey,
      `Updated content from TypeScript!\nOriginal: ${readResult.data?.content}`,
      { 'updated-at': new Date().toISOString() }
    );
    results.update = updateResult.data;
    if (updateResult.success) testsPassed++;

    // 4. ファイル一覧テスト
    console.log('Testing list...');
    const listResult = await listFiles('typescript-files');
    results.list = listResult.data;
    if (listResult.success) testsPassed++;

    // 5. ファイル削除テスト
    console.log('Testing delete...');
    const deleteResult = await deleteFile(testKey);
    results.delete = deleteResult.data;
    if (deleteResult.success) testsPassed++;

    return { results, testsPassed };
  } catch (error: any) {
    console.error('Test error:', error);
    return { results: { error: error.message }, testsPassed };
  }
}

/**
 * Lambda ハンドラー関数
 */
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const body =
      typeof event.body === 'string'
        ? JSON.parse(event.body)
        : event.body || event;
    const action = body.action || 'test';

    console.log(`Performing action: ${action}`);

    let result: any;

    switch (action) {
      case 'test':
        const testResults = await runComprehensiveTest();
        result = {
          success: true,
          message: 'Operation completed successfully',
          data: {
            ...testResults.results,
            testsPassed: testResults.testsPassed,
          },
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'upload':
        const uploadRes = await uploadFile(
          body.key,
          body.content,
          body.metadata || {}
        );
        result = {
          success: uploadRes.success,
          message: uploadRes.success
            ? 'File uploaded successfully'
            : 'Upload failed',
          data: uploadRes.data,
          error: uploadRes.error,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'read':
        const readRes = await readFile(body.key);
        result = {
          success: readRes.success,
          message: readRes.success ? 'File read successfully' : 'Read failed',
          data: readRes.data,
          error: readRes.error,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'update':
        const updateRes = await updateFile(
          body.key,
          body.content,
          body.metadata || {}
        );
        result = {
          success: updateRes.success,
          message: updateRes.success
            ? 'File updated successfully'
            : 'Update failed',
          data: updateRes.data,
          error: updateRes.error,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'list':
        const listRes = await listFiles(body.prefix || '');
        result = {
          success: listRes.success,
          message: listRes.success
            ? 'Files listed successfully'
            : 'List failed',
          data: listRes.data,
          error: listRes.error,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      case 'delete':
        const deleteRes = await deleteFile(body.key);
        result = {
          success: deleteRes.success,
          message: deleteRes.success
            ? 'File deleted successfully'
            : 'Delete failed',
          data: deleteRes.data,
          error: deleteRes.error,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        result = {
          success: false,
          message: `Unknown action: ${action}`,
          language: 'TypeScript',
          timestamp: new Date().toISOString(),
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message,
        language: 'TypeScript',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
