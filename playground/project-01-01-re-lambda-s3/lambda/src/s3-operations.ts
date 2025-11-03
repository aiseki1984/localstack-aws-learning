import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME, createS3Key, extractFileName, createSuccessHeaders } from './s3-config';
import { LambdaResponse, FileUploadRequest, UploadResponse, FileContentResponse, FileListResponse, DeleteResponse } from './types';

// テキストファイルをS3にアップロードする関数
export const uploadTextFile = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  try {
    const body = JSON.parse(event.body || '{}') as FileUploadRequest;
    const { fileName, content } = body;

    if (!fileName || !content) {
      return {
        statusCode: 400,
        headers: createSuccessHeaders(),
        body: JSON.stringify({ error: 'fileName and content are required' })
      };
    }

    const key = createS3Key(fileName);
    
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

    const response: UploadResponse = {
      message: 'File uploaded successfully',
      bucket: BUCKET_NAME,
      key: key,
      fileName: fileName
    };

    return {
      statusCode: 200,
      headers: createSuccessHeaders(),
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      statusCode: 500,
      headers: createSuccessHeaders(),
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
        headers: createSuccessHeaders(),
        body: JSON.stringify({ error: 'fileName is required' })
      };
    }

    const key = createS3Key(fileName);
    
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(getCommand);
    const content = await response.Body?.transformToString();

    const fileResponse: FileContentResponse = {
      fileName: fileName,
      content: content,
      contentType: response.ContentType,
      lastModified: response.LastModified,
      metadata: response.Metadata
    };

    return {
      statusCode: 200,
      headers: createSuccessHeaders(),
      body: JSON.stringify(fileResponse)
    };

  } catch (error: any) {
    console.error('Error getting file:', error);
    
    if (error.name === 'NoSuchKey') {
      return {
        statusCode: 404,
        headers: createSuccessHeaders(),
        body: JSON.stringify({ error: 'File not found' })
      };
    }

    return {
      statusCode: 500,
      headers: createSuccessHeaders(),
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
      fileName: obj.Key ? extractFileName(obj.Key) : undefined,
      size: obj.Size,
      lastModified: obj.LastModified
    })) || [];

    const fileListResponse: FileListResponse = {
      bucket: BUCKET_NAME,
      files: files,
      count: files.length
    };

    return {
      statusCode: 200,
      headers: createSuccessHeaders(),
      body: JSON.stringify(fileListResponse)
    };

  } catch (error) {
    console.error('Error listing files:', error);
    return {
      statusCode: 500,
      headers: createSuccessHeaders(),
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
        headers: createSuccessHeaders(),
        body: JSON.stringify({ error: 'fileName is required' })
      };
    }

    const key = createS3Key(fileName);
    
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(deleteCommand);

    const deleteResponse: DeleteResponse = {
      message: 'File deleted successfully',
      fileName: fileName,
      key: key
    };

    return {
      statusCode: 200,
      headers: createSuccessHeaders(),
      body: JSON.stringify(deleteResponse)
    };

  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      statusCode: 500,
      headers: createSuccessHeaders(),
      body: JSON.stringify({ error: 'Failed to delete file' })
    };
  }
};