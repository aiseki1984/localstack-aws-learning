import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// S3クライアントの設定（LocalStack用）
const s3Client = new S3Client({
  endpoint: process.env.LOCALSTACK_ENDPOINT || "http://localhost:4566",
  region: process.env.AWS_REGION || "us-east-1",
  forcePathStyle: true, // LocalStackで必要
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test"
  }
});

const BUCKET_NAME = process.env.BUCKET_NAME || "my-test-bucket";

interface LambdaResponse {
  statusCode: number;
  headers?: { [key: string]: string };
  body: string;
}

// テキストファイルをS3にアップロードする関数
export const uploadTextFile = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { fileName, content } = body;

    if (!fileName || !content) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'fileName and content are required' })
      };
    }

    const key = `uploads/${fileName}`;
    
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
      Metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'lambda-function'
      }
    });

    await s3Client.send(putCommand);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'File uploaded successfully',
        bucket: BUCKET_NAME,
        key: key,
        fileName: fileName
      })
    };

  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to upload file' })
    };
  }
};

// S3からテキストファイルを取得する関数
export const getTextFile = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  try {
    const { fileName } = event.pathParameters || {};
    
    if (!fileName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'fileName is required' })
      };
    }

    const key = `uploads/${fileName}`;
    
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(getCommand);
    const content = await response.Body?.transformToString();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: fileName,
        content: content,
        contentType: response.ContentType,
        lastModified: response.LastModified,
        metadata: response.Metadata
      })
    };

  } catch (error: any) {
    console.error('Error getting file:', error);
    
    if (error.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to get file' })
    };
  }
};

// S3のファイル一覧を取得する関数
export const listFiles = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'uploads/'
    });

    const response = await s3Client.send(listCommand);
    
    const files = response.Contents?.map(obj => ({
      key: obj.Key,
      fileName: obj.Key?.replace('uploads/', ''),
      size: obj.Size,
      lastModified: obj.LastModified
    })) || [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket: BUCKET_NAME,
        files: files,
        count: files.length
      })
    };

  } catch (error) {
    console.error('Error listing files:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to list files' })
    };
  }
};

// S3からファイルを削除する関数
export const deleteFile = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  try {
    const { fileName } = event.pathParameters || {};
    
    if (!fileName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'fileName is required' })
      };
    }

    const key = `uploads/${fileName}`;
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(deleteCommand);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'File deleted successfully',
        fileName: fileName,
        key: key
      })
    };

  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to delete file' })
    };
  }
};

// 統合ハンドラー - HTTPメソッドとパスに基づいてルーティング
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    const httpMethod = event.httpMethod || 'POST'; // デフォルトはPOST
    const path = event.path || event.resource || '/';
    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};

    console.log(`Processing ${httpMethod} request to ${path}`);

    // ルーティングロジック
    switch (httpMethod.toUpperCase()) {
      case 'POST':
        // CREATE: ファイルアップロード
        console.log('Routing to uploadTextFile');
        return await uploadTextFile(event, context);

      case 'GET':
        // READ: ファイル取得または一覧取得
        if (pathParameters.fileName || queryStringParameters.fileName) {
          console.log('Routing to getTextFile');
          // パスパラメータまたはクエリパラメータでファイル名が指定されている場合
          if (queryStringParameters.fileName && !pathParameters.fileName) {
            // クエリパラメータからパスパラメータに移動
            event.pathParameters = { ...pathParameters, fileName: queryStringParameters.fileName };
          }
          return await getTextFile(event, context);
        } else {
          console.log('Routing to listFiles');
          // ファイル一覧取得
          return await listFiles(event, context);
        }

      case 'PUT':
        // UPDATE: ファイル更新（アップロードと同じ処理）
        console.log('Routing to uploadTextFile (update)');
        return await uploadTextFile(event, context);

      case 'DELETE':
        // DELETE: ファイル削除
        console.log('Routing to deleteFile');
        if (!pathParameters.fileName && !queryStringParameters.fileName) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'fileName is required for DELETE operation',
              hint: 'Provide fileName in path parameters or query parameters'
            })
          };
        }
        
        // クエリパラメータからパスパラメータに移動（必要な場合）
        if (queryStringParameters.fileName && !pathParameters.fileName) {
          event.pathParameters = { ...pathParameters, fileName: queryStringParameters.fileName };
        }
        
        return await deleteFile(event, context);

      default:
        return {
          statusCode: 405,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            error: 'Method not allowed',
            allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
            receivedMethod: httpMethod,
            examples: {
              'POST /': 'Upload file (body: {fileName, content})',
              'GET /': 'List all files',
              'GET /{fileName}': 'Get specific file',
              'PUT /': 'Update/upload file (body: {fileName, content})',
              'DELETE /{fileName}': 'Delete specific file'
            }
          })
        };
    }

  } catch (error) {
    console.error('Handler error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
