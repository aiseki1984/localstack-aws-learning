# Lambda TypeScript + API Gateway + DynamoDB プロジェクト

AWS Lambda(TypeScript) + API Gateway + DynamoDB を使った学習用 REST API プロジェクトです。
記事投稿システムの CRUD API を実装し、LocalStack 環境でのテスト・デプロイ方法を学習できます。

## 📋 プロジェクト概要

- **目的**: Lambda + API Gateway + DynamoDB + TypeScript の学習
- **機能**: 記事（Post）の CRUD 操作
- **データ**: DynamoDB（永続化ストレージ）
- **環境**: LocalStack（AWS サービスエミュレーション）
- **テスト**: Vitest を使った包括的なテスト（モック化対応）
- **ビルド**: esbuild による高速ビルド

## 🏗️ プロジェクト構造

```
project-02-apigateway-lambda-dynamodb/
├── readme.md                     # プロジェクトドキュメント
├── test.http                     # HTTP APIテスト用ファイル
├── lambda/                       # Lambda関数
│   ├── package.json              # 依存関係とスクリプト
│   ├── tsconfig.json             # TypeScript設定
│   ├── vitest.config.ts          # テスト設定
│   └── src/
│       ├── index.ts              # メインハンドラー
│       ├── index.test.ts         # ハンドラーのテスト
│       ├── posts-service.ts      # ビジネスロジック（DynamoDB統合）
│       ├── dynamodb-client.ts    # DynamoDBクライアント設定
│       └── types.ts              # 型定義
└── scripts/
    ├── deploy.sh                 # デプロイスクリプト
    ├── cleanup.sh                # リソース削除スクリプト
    └── list-resources.sh         # リソース一覧表示
```

## 🚀 API エンドポイント

実装されている CRUD 操作：

| メソッド  | エンドポイント          | 説明                                             |
| --------- | ----------------------- | ------------------------------------------------ |
| `GET`     | `/posts`                | 記事一覧の取得（フィルタ・ページネーション対応） |
| `GET`     | `/posts/{id}`           | 特定記事の取得                                   |
| `POST`    | `/posts`                | 新規記事の作成                                   |
| `PUT`     | `/posts/{id}`           | 記事の更新                                       |
| `DELETE`  | `/posts/{id}`           | 記事の削除                                       |
| `OPTIONS` | `/posts`, `/posts/{id}` | CORS 対応                                        |

### クエリパラメータ（GET /posts）

- `limit`: 取得件数制限（デフォルト: 10）
- `offset`: 取得開始位置（デフォルト: 0）
- `status`: ステータスフィルタ（`draft`, `published`, `archived`）
- `author`: 作成者フィルタ
- `tag`: タグフィルタ

### リクエスト・レスポンス例

**POST /posts**

```json
{
  "title": "Lambda入門",
  "content": "Lambda関数の基本的な使い方について説明します...",
  "author": "John Doe",
  "tags": ["aws", "lambda", "serverless"],
  "status": "draft"
}
```

**レスポンス**

```json
{
  "success": true,
  "data": {
    "id": "4",
    "title": "Lambda入門",
    "content": "Lambda関数の基本的な使い方について説明します...",
    "author": "John Doe",
    "createdAt": "2024-11-04T12:00:00Z",
    "updatedAt": "2024-11-04T12:00:00Z",
    "tags": ["aws", "lambda", "serverless"],
    "status": "draft"
  },
  "message": "Post created successfully"
}
```

## 🔧 開発環境のセットアップ

### 前提条件

- Node.js 18.x 以降
- LocalStack 環境
- AWS CLI

### インストール

```bash
# プロジェクトディレクトリに移動
cd lambda/

# 依存関係のインストール
npm install
```

## 🧪 テスト実行

包括的なテストスイート（15 のテストケース）が実装されています。

```bash
# ワッチモードでテスト実行
npm test

# 一度だけテスト実行
npm run test:run

# テスト結果の確認
# ✓ GET /posts の動作確認
# ✓ POST /posts のバリデーション
# ✓ PUT /posts/{id} の更新処理
# ✓ DELETE /posts/{id} の削除処理
# ✓ CORS とエラーハンドリング
```

### テストカバレッジ

- ✅ 全 HTTP メソッドの動作テスト
- ✅ パラメータバリデーション
- ✅ エラーハンドリング（404, 400, 405, 500）
- ✅ CORS 対応の確認
- ✅ フィルタリング・ページネーション

## �️ DynamoDB統合

このプロジェクトでは、データの永続化にDynamoDBを使用しています。

### テーブル構造

**テーブル名**: `posts-table`

| 属性名 | 型 | 説明 |
|--------|----|----|
| `id` (PK) | String | 投稿ID（UUID） |
| `title` | String | 記事タイトル |
| `content` | String | 記事本文 |
| `author` | String | 作成者 |
| `createdAt` | String | 作成日時（ISO 8601） |
| `updatedAt` | String | 更新日時（ISO 8601） |
| `tags` | List<String> | タグ配列 |
| `status` | String | ステータス（draft/published/archived） |

### AWS SDK v3の使用

- **@aws-sdk/client-dynamodb**: DynamoDBの低レベルAPI
- **@aws-sdk/lib-dynamodb**: DocumentClient（高レベルAPI）

```typescript
// DynamoDBクライアントの初期化例
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: 'us-east-1',
  endpoint: process.env.AWS_ENDPOINT_URL, // LocalStack対応
}));

// データの保存
await client.send(new PutCommand({
  TableName: 'posts-table',
  Item: { id: '1', title: 'Test', ... }
}));
```

### LocalStack対応

環境変数 `AWS_ENDPOINT_URL` を使用してLocalStackに接続します：

```typescript
// lambda/src/dynamodb-client.ts
const endpoint = process.env.AWS_ENDPOINT_URL;
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(endpoint && { endpoint, forcePathStyle: true }),
});
```

## �🚀 デプロイメント

### LocalStack へのデプロイ

```bash
# 環境変数設定
export AWS_ENDPOINT_URL=http://localstack:4566

# デプロイ実行
./scripts/deploy.sh
```

デプロイされるリソース：

- **DynamoDB テーブル**: `posts-table`
- **Lambda 関数**: `posts-api-lambda`
- **IAM ロール**: `lambda-api-execution-role`
- **API Gateway**: `posts-api`

デプロイスクリプトは以下の順序で実行されます：

1. DynamoDBテーブル作成（キー: `id`）
2. IAMロール作成
3. TypeScriptビルド
4. Lambda関数デプロイ（環境変数: `TABLE_NAME`, `AWS_ENDPOINT_URL`）
5. API Gateway設定（リソース、メソッド、統合）
6. ステージデプロイ

### API テスト

デプロイ後、以下のコマンドで API をテストできます：

```bash
# 基本URL（デプロイ時に表示される）
API_ENDPOINT="http://localstack:4566/restapis/{API_ID}/dev/_user_request_"

# 記事一覧取得
curl "$API_ENDPOINT/posts"

# 特定記事取得
curl "$API_ENDPOINT/posts/1"

# 新規記事作成
curl -X POST "$API_ENDPOINT/posts" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "新しい記事",
    "content": "記事の内容です",
    "author": "テスト太郎",
    "tags": ["test"],
    "status": "draft"
  }'

# 記事更新
curl -X PUT "$API_ENDPOINT/posts/1" \
  -H "Content-Type: application/json" \
  -d '{"title": "更新されたタイトル"}'

# 記事削除
curl -X DELETE "$API_ENDPOINT/posts/1"
```

## 🧹 リソース削除

```bash
# 作成したAWSリソースを全て削除
export AWS_ENDPOINT_URL=http://localstack:4566
./scripts/cleanup.sh
```

## 💻 開発用スクリプト

```bash
# TypeScript開発（ウォッチモード）
npm run dev

# ビルド実行
npm run build

# 型チェック
npm run typecheck

# デプロイ（npm経由）
npm run deploy

# クリーンアップ（npm経由）
npm run cleanup
```

## 🏗️ アーキテクチャの特徴

### TypeScript 型安全性

- 厳密な型定義（`Post`, `ApiResponse`, `GetPostsQuery` など）
- リクエスト・レスポンスの型チェック
- エラーハンドリングの型安全性

### DynamoDB統合

- **AWS SDK v3**: 最新のモジュラーSDK
- **DocumentClient**: 高レベルAPIで簡単なデータ操作
- **UUID**: 衝突のないID生成
- **FilterExpression**: 柔軟なクエリフィルタリング

### モダンな開発環境

- **esbuild**: 高速ビルド・バンドル（AWS SDKは外部化）
- **Vitest**: 高速テスト実行・ホットリロード
- **TypeScript**: 型安全性・開発効率

### 本番対応設計

- CORS 対応
- 包括的エラーハンドリング
- 構造化ログ出力
- Lambda 最適化（バンドルサイズ最小化）
- データ永続化（DynamoDB）

### テスト戦略

1. **単体テスト**: DynamoDBクライアントをモック化してビジネスロジックをテスト
2. **統合テスト**: Lambda ハンドラーの動作確認（PostsServiceをモック注入）
3. **E2E テスト**: 実際のLocalStack環境でAPI動作確認

## �️ 手動デプロイの流れ（学習用）

このプロジェクトでは **手動でのAWSリソース構築** を学習できます。
以下の手順で Lambda + API Gateway を一つ一つ構築していきます：

### 📋 手動デプロイの全手順

1. **IAMロール作成** 
   ```bash
   aws iam create-role --role-name lambda-api-execution-role
   ```

2. **Lambda関数作成**
   ```bash
   # TypeScript ビルド
   npm run build
   
   # ZIPパッケージ作成  
   zip -r function.zip dist/
   
   # Lambda関数デプロイ
   aws lambda create-function --function-name posts-api-lambda
   ```

3. **API Gateway作成**
   ```bash
   # REST API作成
   aws apigateway create-rest-api --name posts-api
   
   # ルートリソースID取得
   aws apigateway get-resources
   ```

4. **リソース階層構築**
   ```bash
   # /posts リソース作成
   aws apigateway create-resource --path-part "posts"
   
   # /posts/{id} リソース作成  
   aws apigateway create-resource --path-part "{id}"
   ```

5. **メソッドと統合設定**（各リソース×各HTTPメソッド）
   ```bash
   # HTTPメソッド作成（GET, POST, PUT, DELETE, OPTIONS）
   aws apigateway put-method --http-method GET
   
   # Lambda統合設定  
   aws apigateway put-integration --type AWS_PROXY
   ```

6. **デプロイメント**
   ```bash
   # ステージ作成・デプロイ
   aws apigateway create-deployment --stage-name dev
   ```

7. **権限設定**
   ```bash
   # API GatewayからLambda呼び出し権限付与
   aws lambda add-permission --principal apigateway.amazonaws.com
   ```

### 📊 手動 vs IaC の比較

| 手動デプロイ | CDK/CloudFormation |
|-------------|-------------------|
| **7つの主要ステップ** | **1つのコマンド** |
| **20+ AWS CLI コマンド** | **数行のコード** |
| **リソースID管理が必要** | **自動管理** |
| **手順の順序が重要** | **依存関係自動解決** |
| **削除時も手動手順** | **一括削除可能** |
| **設定ミスしやすい** | **型チェック・バリデーション** |

**手動デプロイの価値**: 
- ✅ AWS サービス間の関係性を深く理解
- ✅ API Gateway の内部構造を学習  
- ✅ 権限モデルの詳細把握
- ✅ トラブルシューティング力向上

**IaC の価値**:
- ✅ 素早いデプロイ・削除
- ✅ 再現性・一貫性
- ✅ バージョン管理
- ✅ チーム開発効率

> 💡 **学習のおすすめ**: まず手動で理解 → CDK/CloudFormation で効率化

## 📚 学習ポイント

このプロジェクトで学習できる内容：

1. **Lambda 関数の基本構造**: ハンドラー、コンテキスト、レスポンス形式
2. **API Gateway 統合**: プロキシ統合、ルーティング、CORS
3. **DynamoDB 操作**: AWS SDK v3による CRUD 操作
4. **TypeScript 活用**: 型安全な API 開発
5. **テスト駆動開発**: モック化を含む包括的なテストスイート作成
6. **自動化**: デプロイ・クリーンアップスクリプト
7. **LocalStack**: AWS サービスのローカル開発環境
8. **手動構築**: AWS CLI による詳細なリソース管理

### DynamoDB学習のポイント

- **DocumentClient vs 低レベルAPI**: 使いやすい高レベルAPIの活用
- **Scan vs Query**: データ取得パターンの違いと使い分け
- **FilterExpression**: 柔軟なフィルタリング条件の記述
- **UpdateExpression**: 部分更新の効率的な実装
- **エラーハンドリング**: DynamoDB特有のエラー処理

## � API Gateway v2 への移行

現在のプロジェクトは **API Gateway v1 (REST API)** を使用していますが、**v2 (HTTP API)** への移行も検討できます。

### 📊 v1 vs v2 比較

| 項目 | API Gateway v1 (REST API) | API Gateway v2 (HTTP API) |
|------|---------------------------|---------------------------|
| **パフォーマンス** | 標準 | **最大70%高速** |
| **コスト** | 標準 | **最大70%削減** |
| **設定の複雑さ** | 複雑（詳細設定可能） | **シンプル** |
| **CORS設定** | 手動設定が必要 | **自動設定オプション** |
| **JWT認証** | カスタム実装 | **ネイティブサポート** |
| **WebSocket** | 別サービス (API Gateway v1 WebSocket) | **統合サポート** |

### 🔧 TypeScriptコードの変更点

#### **型定義の変更**
```typescript
// v1 (現在)
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// v2 (変更後)
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
```

#### **イベントオブジェクトの違い**
```typescript
// v1 (現在)
const method = event.httpMethod;        // "GET"
const path = event.path;                // "/posts"

// v2 (変更後) 
const method = event.requestContext.http.method;  // "GET"
const path = event.rawPath;                       // "/posts"
```

### 🛠️ デプロイスクリプトの変更

```bash
# v1 (現在)
aws apigateway create-rest-api --name posts-api

# v2 (変更後)
aws apigatewayv2 create-api \
  --name posts-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins="*"
```

### ⚠️ 移行時の注意点・躓きやすいポイント

#### 1. **イベント構造の違い**
```typescript
// ❌ v2でこれは動かない
const method = event.httpMethod;  // undefined になる

// ✅ v2ではこう書く
const method = event.requestContext.http.method;
```

#### 2. **クエリパラメータの扱い**
```typescript
// v1: null の場合がある
const params = event.queryStringParameters || {};

// v2: undefined の場合がある  
const params = event.queryStringParameters || {};
```

#### 3. **CORS設定の場所**
- **v1**: Lambda関数内でヘッダー設定が必要
- **v2**: API Gateway レベルで設定可能（簡単）

#### 4. **エラーレスポンス形式**
```typescript
// v1/v2 共通だが、細かい違いに注意
return {
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
};
```

### 🎯 移行の判断基準

#### **v1 を継続する場合**
- ✅ 既存システムとの互換性重視
- ✅ 詳細なカスタマイズが必要
- ✅ リクエスト/レスポンス変換が必要
- ✅ 学習・理解目的（より多くの概念を学べる）

#### **v2 に移行する場合**  
- ✅ 新規プロジェクト
- ✅ コスト・パフォーマンス重視
- ✅ シンプルなREST API
- ✅ JWT認証を使いたい
- ✅ 開発・運用効率を優先

### 💡 移行のステップ

1. **TypeScript型定義更新**: `APIGatewayProxyEventV2` に変更
2. **イベントアクセス修正**: `event.requestContext.http.method` 等
3. **デプロイスクリプト更新**: `apigatewayv2` CLI使用
4. **テスト更新**: 新しいイベント形式でテスト
5. **段階的移行**: 一つずつエンドポイントを移行

### 📁 サンプルファイル

プロジェクト内の `lambda/src/index-v2.example.ts` に **v2対応版のサンプルコード** があります。

> 💭 **学習のおすすめ**: 
> 1. まずv1で基本概念を理解 
> 2. v2の利点と違いを把握
> 3. 実際のプロジェクトでv2を採用検討

## 🔄 次のステップ

1. **GSI（グローバルセカンダリインデックス）**: `author` や `status` でのクエリ最適化
2. **ページネーション改善**: `LastEvaluatedKey` を使った真のDynamoDBページング
3. **API Gateway v2移行**: より高速・低コストなアーキテクチャ
4. **認証・認可**: JWT トークン認証、Cognito統合
5. **バリデーション強化**: Joi/Zod スキーマによる厳密な入力検証
6. **ログ機能**: CloudWatch Logs統合、構造化ログ
7. **パフォーマンス**: Lambda Cold Start最適化、DynamoDBキャパシティ調整
8. **監視・アラート**: CloudWatch メトリクス、X-Ray トレーシング

## 🐛 トラブルシューティング

### よくある問題

**Q: デプロイが失敗する**

```bash
# LocalStack が起動しているか確認
docker ps | grep localstack

# 環境変数が設定されているか確認
echo $AWS_ENDPOINT_URL
```

**Q: テストが失敗する**

```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

**Q: API が応答しない**

```bash
# Lambda関数の状態確認
aws lambda get-function --function-name posts-api-lambda \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1
```

**Q: DynamoDBにデータが保存されない**

```bash
# テーブルの存在確認
aws dynamodb list-tables \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1

# テーブル内容の確認
aws dynamodb scan --table-name posts-table \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1

# Lambda関数の環境変数確認
aws lambda get-function-configuration \
  --function-name posts-api-lambda \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1 \
  --query 'Environment.Variables'
```

**Q: Lambda関数でDynamoDBエラーが発生する**

```bash
# CloudWatch Logsを確認（LocalStackの場合はコンテナログ）
docker logs localstack

# Lambda関数の実行ログを確認
aws logs tail /aws/lambda/posts-api-lambda --follow \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1
```

---

このプロジェクトは学習用に作成されており、実際の本番環境に適用する際は、セキュリティ、パフォーマンス、監視などの追加要件を考慮してください。
