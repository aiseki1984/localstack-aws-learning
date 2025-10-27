import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// シンプルなリクエストインターface
interface SimpleRequest {
  name?: string;
  message?: string;
  data?: any;
}

export const handler = async (event: any): Promise<any> => {
  console.log('Lambda function started');
  console.log('Event:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Hello from TypeScript Lambda!',
      timestamp: new Date().toISOString(),
      event: event,
    }),
  };
};
