/**
 * Lambda Function: User Management API
 *
 * Endpoints:
 * - POST: Create a new user
 * - GET:  Retrieve user by ID
 */
import {
  Context,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { putUser, getUser } from './user';

// Re-export for testing and external use
export * from './types';
export * from './user';

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Event:', JSON.stringify(event, null, 2));

    const method = event.httpMethod;
    const pathParameters = event.pathParameters || {};

    switch (method) {
      case 'POST':
        const body = JSON.parse(event.body || '{}');
        const user = await putUser({
          id: body.id,
          name: body.name,
          email: body.email,
        });
        return {
          statusCode: 201,
          body: JSON.stringify(user),
        };

      case 'GET':
        const userId = pathParameters.id;
        if (!userId) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'User ID is required' }),
          };
        }
        const foundUser = await getUser(userId);
        if (!foundUser) {
          return {
            statusCode: 404,
            body: JSON.stringify({ error: 'User not found' }),
          };
        }
        return {
          statusCode: 200,
          body: JSON.stringify(foundUser),
        };

      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
