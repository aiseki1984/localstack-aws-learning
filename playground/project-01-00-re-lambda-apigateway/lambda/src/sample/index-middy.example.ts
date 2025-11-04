// Middy.js を使用した改善例
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { PostsService } from './posts-service';

const postsService = new PostsService();

const baseHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const path = event.path;
  const pathParameters = event.pathParameters || {};

  // ルーティングロジック（CORSやエラーハンドリングはmiddyが処理）
  switch (method) {
    case 'GET':
      if (path === '/posts') {
        const query = parseQueryParameters(event);
        const result = await postsService.getPosts(query);
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: true,
            data: result,
          }),
        };
      }
      // ... その他のルーティング
      break;
    
    default:
      return {
        statusCode: 405,
        body: JSON.stringify({ success: false, message: 'Method not allowed' }),
      };
  }
  
  return {
    statusCode: 404,
    body: JSON.stringify({ success: false, message: 'Endpoint not found' }),
  };
};

// ミドルウェアを適用
export const handler = middy(baseHandler)
  .use(httpJsonBodyParser()) // JSON body の自動パース
  .use(httpErrorHandler()) // エラーハンドリング
  .use(cors()); // CORS設定