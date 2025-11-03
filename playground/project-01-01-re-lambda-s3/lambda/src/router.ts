import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { uploadTextFile, getTextFile, listFiles, deleteFile } from './s3-operations';
import { LambdaResponse, ErrorResponse } from './types';
import { createSuccessHeaders } from './s3-config';

// HTTPメソッド別のルーティング処理
export class S3Router {
  
  // パスパラメータまたはクエリパラメータからファイル名を取得
  private static getFileName(event: APIGatewayProxyEvent): string | undefined {
    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};
    
    return pathParameters.fileName || queryStringParameters.fileName;
  }

  // ファイル名をパスパラメータに設定（統一化）
  private static setFileName(event: APIGatewayProxyEvent, fileName: string): void {
    if (!event.pathParameters) {
      event.pathParameters = {};
    }
    event.pathParameters.fileName = fileName;
  }

  // GET リクエストの処理
  static async handleGet(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
    const fileName = this.getFileName(event);
    
    if (fileName) {
      console.log(`Routing to getTextFile for: ${fileName}`);
      // ファイル名をパスパラメータに統一
      this.setFileName(event, fileName);
      return await getTextFile(event, context);
    } else {
      console.log('Routing to listFiles');
      return await listFiles(event, context);
    }
  }

  // POST リクエストの処理
  static async handlePost(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
    console.log('Routing to uploadTextFile');
    return await uploadTextFile(event, context);
  }

  // PUT リクエストの処理（更新 = アップロード）
  static async handlePut(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
    console.log('Routing to uploadTextFile (update)');
    return await uploadTextFile(event, context);
  }

  // DELETE リクエストの処理
  static async handleDelete(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
    const fileName = this.getFileName(event);
    
    if (!fileName) {
      const errorResponse: ErrorResponse = {
        error: 'fileName is required for DELETE operation',
        hint: 'Provide fileName in path parameters or query parameters'
      };
      
      return {
        statusCode: 400,
        headers: createSuccessHeaders(),
        body: JSON.stringify(errorResponse)
      };
    }

    console.log(`Routing to deleteFile for: ${fileName}`);
    // ファイル名をパスパラメータに統一
    this.setFileName(event, fileName);
    return await deleteFile(event, context);
  }

  // サポートされていないHTTPメソッドの処理
  static handleUnsupportedMethod(httpMethod: string): LambdaResponse {
    const errorResponse = {
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
    };

    return {
      statusCode: 405,
      headers: createSuccessHeaders(),
      body: JSON.stringify(errorResponse)
    };
  }

  // メインルーティング処理
  static async route(event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> {
    const httpMethod = (event.httpMethod || 'POST').toUpperCase();
    const path = event.path || event.resource || '/';

    console.log(`Processing ${httpMethod} request to ${path}`);

    try {
      switch (httpMethod) {
        case 'GET':
          return await this.handleGet(event, context);
        
        case 'POST':
          return await this.handlePost(event, context);
        
        case 'PUT':
          return await this.handlePut(event, context);
        
        case 'DELETE':
          return await this.handleDelete(event, context);
        
        default:
          return this.handleUnsupportedMethod(httpMethod);
      }
    } catch (error) {
      console.error(`Router error for ${httpMethod} ${path}:`, error);
      
      const errorResponse: ErrorResponse = {
        error: 'Internal routing error',
        message: error instanceof Error ? error.message : 'Unknown routing error'
      };

      return {
        statusCode: 500,
        headers: createSuccessHeaders(),
        body: JSON.stringify(errorResponse)
      };
    }
  }
}