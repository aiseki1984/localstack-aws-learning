import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { S3Router } from './router';
import { LambdaResponse, ErrorResponse } from './types';
import { createSuccessHeaders } from './s3-config';

// 統合ハンドラー - シンプルで読みやすいエントリーポイント
export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<LambdaResponse> => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // S3Routerにルーティングを委譲
    return await S3Router.route(event, context);
    
  } catch (error) {
    console.error('Handler error:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    };

    return {
      statusCode: 500,
      headers: createSuccessHeaders(),
      body: JSON.stringify(errorResponse)
    };
  }
};
