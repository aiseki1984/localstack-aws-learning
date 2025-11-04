// 改善されたCORS設定の例
const getAllowedOrigins = (): string => {
  // 環境変数から設定を読み取り
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  
  // 本番環境では具体的なドメインを指定
  if (process.env.NODE_ENV === 'production') {
    return allowedOrigins || 'https://yourdomain.com';
  }
  
  // 開発環境では * を許可
  return '*';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': getAllowedOrigins(),
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true', // 認証情報を含む場合
};

// セキュリティ強化のためのヘッダー
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

const createResponse = (
  statusCode: number,
  body: any,
  additionalHeaders: Record<string, string> = {}
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders,
    ...securityHeaders,
    ...additionalHeaders,
  },
  body: JSON.stringify(body),
});

export { createResponse, corsHeaders, securityHeaders };