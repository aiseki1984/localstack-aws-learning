import {
  Context,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
  ApiResponse,
  GetPostsQuery,
  GetPostsResponse,
} from './types';
import { PostsService } from './posts-service';

// CORS ヘッダー（v2でも同じ）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// v2用のレスポンス作成ヘルパー
const createResponseV2 = (
  statusCode: number,
  body: ApiResponse | any,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...additionalHeaders,
  },
  body: JSON.stringify(body),
});

// エラーレスポンス作成（v2）
const createErrorResponseV2 = (
  statusCode: number,
  message: string,
  error?: string
): APIGatewayProxyResultV2 =>
  createResponseV2(statusCode, {
    success: false,
    message,
    error,
  });

// 成功レスポンス作成（v2）
const createSuccessResponseV2 = (
  statusCode: number,
  data: any,
  message?: string
): APIGatewayProxyResultV2 =>
  createResponseV2(statusCode, {
    success: true,
    data,
    message,
  });

// v2用のクエリパラメータパース
const parseQueryParametersV2 = (event: APIGatewayProxyEventV2): GetPostsQuery => {
  const queryStringParameters = event.queryStringParameters || {};

  return {
    limit: queryStringParameters.limit
      ? parseInt(queryStringParameters.limit, 10)
      : undefined,
    offset: queryStringParameters.offset
      ? parseInt(queryStringParameters.offset, 10)
      : undefined,
    status: queryStringParameters.status as
      | 'draft'
      | 'published'
      | 'archived'
      | undefined,
    author: queryStringParameters.author,
    tag: queryStringParameters.tag,
  };
};

// Posts service instance
const postsService = new PostsService();

export const handlerV2 = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResultV2> => {
  try {
    console.log('Event V2:', JSON.stringify(event, null, 2));

    // v2では requestContext.http.method を使用
    const method = event.requestContext.http.method;
    // v2では rawPath を使用
    const path = event.rawPath;
    const pathParameters = event.pathParameters || {};

    // CORS preflight handling
    if (method === 'OPTIONS') {
      return createResponseV2(200, { message: 'CORS preflight' });
    }

    // ルーティング（ロジック自体は同じ）
    switch (method) {
      case 'GET':
        if (path === '/posts') {
          // GET /posts - 投稿一覧取得
          const query = parseQueryParametersV2(event);
          const result = await postsService.getPosts(query);
          return createSuccessResponseV2(200, result);
        } else if (pathParameters.id) {
          // GET /posts/{id} - 特定投稿の取得
          const post = await postsService.getPostById(pathParameters.id);
          if (!post) {
            return createErrorResponseV2(404, 'Post not found');
          }
          return createSuccessResponseV2(200, post);
        }
        break;

      case 'POST':
        if (path === '/posts') {
          // POST /posts - 新規投稿作成
          if (!event.body) {
            return createErrorResponseV2(400, 'Request body is required');
          }

          const createRequest: CreatePostRequest = JSON.parse(event.body);

          // バリデーション
          if (
            !createRequest.title ||
            !createRequest.content ||
            !createRequest.author
          ) {
            return createErrorResponseV2(
              400,
              'Title, content, and author are required'
            );
          }

          const newPost = await postsService.createPost(createRequest);
          return createSuccessResponseV2(
            201,
            newPost,
            'Post created successfully'
          );
        }
        break;

      case 'PUT':
        if (pathParameters.id) {
          // PUT /posts/{id} - 投稿更新
          if (!event.body) {
            return createErrorResponseV2(400, 'Request body is required');
          }

          const updateRequest: UpdatePostRequest = JSON.parse(event.body);
          const updatedPost = await postsService.updatePost(
            pathParameters.id,
            updateRequest
          );

          if (!updatedPost) {
            return createErrorResponseV2(404, 'Post not found');
          }

          return createSuccessResponseV2(
            200,
            updatedPost,
            'Post updated successfully'
          );
        }
        break;

      case 'DELETE':
        if (pathParameters.id) {
          // DELETE /posts/{id} - 投稿削除
          const deleted = await postsService.deletePost(pathParameters.id);

          if (!deleted) {
            return createErrorResponseV2(404, 'Post not found');
          }

          return createSuccessResponseV2(
            200,
            { id: pathParameters.id },
            'Post deleted successfully'
          );
        }
        break;

      default:
        return createErrorResponseV2(405, 'Method not allowed');
    }

    return createErrorResponseV2(404, 'Endpoint not found');
  } catch (error) {
    console.error('Error:', error);
    return createErrorResponseV2(
      500,
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};