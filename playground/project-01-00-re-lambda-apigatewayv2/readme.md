# Lambda TypeScript + API Gateway v2 プロジェクト

AWS Lambda(TypeScript) + API Gateway v2 (HTTP API) を使った学習用 REST API プロジェクトです。
記事投稿システムの CRUD API を実装し、LocalStack 環境でのテスト・デプロイ方法を学習できます。

## 📋 プロジェクト概要

- **目的**: Lambda + API Gateway v2 + TypeScript の学習
- **機能**: 記事（Post）の CRUD 操作
- **データ**: インメモリ（ダミーデータ）
- **環境**: LocalStack（AWS サービスエミュレーション）
- **API タイプ**: API Gateway v2 (HTTP API) - 高速・低コスト
- **テスト**: Vitest を使った包括的なテスト
- **ビルド**: esbuild による高速ビルド

## 🚀 API Gateway v2 の特徴

### v2 (HTTP API) の利点

| 項目 | API Gateway v2 (HTTP API) |
|------|---------------------------|
| **パフォーマンス** | **最大70%高速** |
| **コスト** | **最大70%削減** |
| **設定の複雑さ** | **シンプル** |
| **CORS設定** | **自動設定オプション** |
| **JWT認証** | **ネイティブサポート** |
| **デプロイ** | **自動デプロイ機能** |

## 🏗️ プロジェクト構造

```
project-01-00-re-lambda-apigatewayv2/
├── readme.md                     # プロジェクトドキュメント
├── test.http                     # REST Client テストファイル
├── lambda/                       # Lambda関数
│   ├── package.json              # 依存関係とスクリプト
│   ├── tsconfig.json             # TypeScript設定
│   ├── vitest.config.ts          # テスト設定
│   └── src/
│       ├── index.ts              # メインハンドラー (v2対応)
│       ├── index.test.ts         # ハンドラーのテスト
│       ├── posts-service.ts      # ビジネスロジック
│       └── types.ts              # 型定義
└── scripts/
    ├── deploy.sh                 # デプロイスクリプト (v2)
    ├── deploy-apigatewayv1.sh    # v1デプロイスクリプト（参考用）
    ├── cleanup.sh                # リソース削除スクリプト
    └── list-resources.sh         # リソース確認スクリプト
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
# テスト実行（API Gateway v2形式のイベントでテスト）
npm test

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
- ✅ API Gateway v2 イベント形式の検証

## 🚀 デプロイメント

### ⚠️ 重要: LocalStack 無料版の制限

LocalStack の**無料版では API Gateway v2 (HTTP API) がサポートされていません**。

以下の2つの選択肢があります：

#### オプション 1: API Gateway v1 (REST API) を使用 【推奨】

```bash
# 環境変数設定
export AWS_ENDPOINT_URL=http://localstack:4566

# v1用デプロイスクリプトを実行
./scripts/deploy-apigatewayv1.sh
```

**注意**: Lambda コードは v2 形式ですが、v1 でも互換性があります。

#### オプション 2: LocalStack Pro を使用

LocalStack Pro（有料版）では API Gateway v2 が利用可能です。

```bash
# 環境変数設定
export AWS_ENDPOINT_URL=http://localstack:4566
export LOCALSTACK_AUTH_TOKEN=your-auth-token

# v2用デプロイスクリプトを実行
./scripts/deploy.sh
```

### デプロイされるリソース

- Lambda 関数: `posts-api-lambda`
- IAM ロール: `lambda-api-execution-role`
- API Gateway: `posts-api`
- ステージ: `dev`

### リソース確認

```bash
# デプロイされたリソースを確認
export AWS_ENDPOINT_URL=http://localstack:4566
./scripts/list-resources.sh
```

### API テスト

デプロイ後、以下の方法で API をテストできます：

#### 1. curl コマンド

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

#### 2. REST Client (VS Code)

`test.http` ファイルを使って、VS Code の REST Client 拡張機能でテストできます：

1. VS Code で REST Client 拡張機能をインストール
2. `test.http` ファイルを開く
3. API ID を更新（`@api_id = your-api-id`）
4. 各リクエストの「Send Request」をクリック

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

# リソース確認（npm経由）
npm run list-resources
```

## 🏗️ アーキテクチャの特徴

### API Gateway v2 (HTTP API) の実装

このプロジェクトは API Gateway v2 を想定して実装されています：

#### **TypeScript型定義**
```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
```

#### **イベント構造の違い**
```typescript
// v2のイベント構造
const method = event.requestContext.http.method;  // "GET"
const path = event.rawPath;                       // "/posts"
```

#### **v1との互換性**
Lambda コードは v2 形式ですが、v1 の REST API でも動作します（LocalStack 無料版用）。

### TypeScript 型安全性

- 厳密な型定義（`Post`, `ApiResponse`, `GetPostsQuery` など）
- リクエスト・レスポンスの型チェック
- エラーハンドリングの型安全性
- API Gateway v2 専用の型サポート

### モダンな開発環境

- **esbuild**: 高速ビルド・バンドル
- **Vitest**: 高速テスト実行・ホットリロード
- **TypeScript**: 型安全性・開発効率

### 本番対応設計

- CORS 対応
- 包括的エラーハンドリング
- 構造化ログ出力
- Lambda 最適化（バンドルサイズ最小化）

## 🛠️ API Gateway v2 デプロイの流れ

このプロジェクトは **API Gateway v2 (HTTP API)** を想定していますが、LocalStack 無料版では v1 を使用します：

### 📋 デプロイ手順（v2 想定）

1. **IAMロール作成**
   ```bash
   aws iam create-role --role-name lambda-api-execution-role
   ```

2. **Lambda関数作成**
   ```bash
   npm run build
   cd dist && zip -r ../function.zip .
   aws lambda create-function --function-name posts-api-lambda
   ```

3. **API Gateway v2 作成**
   ```bash
   # HTTP API作成（v2）
   aws apigatewayv2 create-api \
     --name posts-api \
     --protocol-type HTTP
   ```

4. **Lambda統合の作成**
   ```bash
   # 統合設定
   aws apigatewayv2 create-integration \
     --api-id $API_ID \
     --integration-type AWS_PROXY \
     --payload-format-version "2.0"
   ```

5. **ルート作成**
   ```bash
   # ルート定義（v2はシンプル）
   aws apigatewayv2 create-route \
     --api-id $API_ID \
     --route-key "GET /posts" \
     --target "integrations/$INTEGRATION_ID"
   ```

6. **ステージ作成とデプロイ**
   ```bash
   # 自動デプロイ有効化
   aws apigatewayv2 create-stage \
     --api-id $API_ID \
     --stage-name "dev" \
     --auto-deploy
   ```

7. **権限設定**
   ```bash
   aws lambda add-permission \
     --function-name posts-api-lambda \
     --principal apigateway.amazonaws.com
   ```

### 📊 v1 vs v2 デプロイの比較

| 項目 | v1 (REST API) | v2 (HTTP API) |
|------|---------------|---------------|
| **API作成** | `apigateway create-rest-api` | `apigatewayv2 create-api` |
| **リソース階層** | 必要（`/posts`, `/posts/{id}`） | **不要（ルートで直接指定）** |
| **メソッド設定** | リソースごとに個別設定 | **ルートキーで一括指定** |
| **統合設定** | 各メソッドごと | **一つの統合で全メソッド** |
| **デプロイ** | 手動デプロイ | **自動デプロイオプション** |
| **CORS** | 手動設定（Lambda内） | **API Gateway レベルで設定可能** |
| **設定コマンド数** | 20+ | **7つ** |
| **LocalStack無料版** | ✅ **利用可能** | ❌ **要Pro版** |

### ✅ v2 の利点

1. **設定がシンプル**: リソース階層の管理不要
2. **デプロイが高速**: 自動デプロイ機能
3. **コスト削減**: 最大70%のコスト削減（本番AWS）
4. **パフォーマンス向上**: 最大70%高速化（本番AWS）
5. **CORS設定が簡単**: API Gateway レベルで設定可能

## 📚 学習ポイント

このプロジェクトで学習できる内容：

1. **Lambda 関数の基本構造**: ハンドラー、コンテキスト、レスポンス形式
2. **API Gateway v2 理解**: HTTP API の概念とv1との違い
3. **TypeScript 活用**: 型安全な API 開発
4. **テスト駆動開発**: 包括的なテストスイート作成
5. **自動化**: デプロイ・クリーンアップスクリプト
6. **LocalStack**: AWS サービスのローカル開発環境
7. **v1 vs v2**: API Gateway の進化と違いを理解

## 🔄 次のステップ

1. **本番AWS環境**: API Gateway v2 を実際のAWSで試す
2. **データ永続化**: DynamoDB 統合
3. **認証・認可**: JWT トークン認証（v2のネイティブサポート活用）
4. **バリデーション強化**: Joi/Zod スキーマ
5. **ログ機能**: CloudWatch Logs 統合
6. **パフォーマンス**: Cold Start 最適化
7. **CORS高度化**: API Gateway v2の詳細なCORS設定
8. **WebSocket**: v2のWebSocket統合
9. **CDK/IaC**: インフラのコード化

## 🐛 トラブルシューティング

### よくある問題

**Q: デプロイが失敗する（v2）**

```bash
# LocalStack無料版ではv2が使えません
# エラー: "The API for service 'apigatewayv2' is either not included..."

# 解決策: v1用のスクリプトを使用
./scripts/deploy-apigatewayv1.sh
```

**Q: LocalStack が起動しているか確認**

```bash
# LocalStack コンテナの確認
docker ps | grep localstack

# 環境変数が設定されているか確認
echo $AWS_ENDPOINT_URL

# LocalStackのヘルスチェック
curl -s "$AWS_ENDPOINT_URL/_localstack/health" | jq
```

**Q: テストが失敗する**

```bash
# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install

# API Gateway v2形式のイベントを確認
# lambda/src/index.test.ts の createMockEvent を参照
```

**Q: API が応答しない**

```bash
# Lambda関数の状態確認
aws lambda get-function --function-name posts-api-lambda \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1

# API Gateway の状態確認（v1の場合）
aws apigateway get-rest-apis \
  --endpoint-url=$AWS_ENDPOINT_URL --region us-east-1

# デプロイ状態確認
./scripts/list-resources.sh
```

**Q: CORS エラーが出る**

Lambda関数内でCORSヘッダーを設定しているため、通常は問題ありません。
問題がある場合は `lambda/src/index.ts` の `corsHeaders` を確認してください。

## 📖 参考資料

- [AWS Lambda ハンドラー (TypeScript)](https://docs.aws.amazon.com/lambda/latest/dg/typescript-handler.html)
- [API Gateway v2 (HTTP API) ドキュメント](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html)
- [API Gateway v1 vs v2 比較](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [LocalStack ドキュメント](https://docs.localstack.cloud/)
- [LocalStack Coverage（サービス対応状況）](https://docs.localstack.cloud/references/coverage/)
- [esbuild ドキュメント](https://esbuild.github.io/)
- [Vitest ドキュメント](https://vitest.dev/)

## 💡 学習のヒント

1. **まずv1で理解を深める**: LocalStack無料版でv1を使って基本を学ぶ
2. **v2の概念を理解する**: コードはv2形式なので、違いを意識する
3. **本番AWSでv2を試す**: 実際のAWSアカウントでv2の利点を体験
4. **CDKで自動化**: 手動デプロイから IaC への移行を学ぶ

---

このプロジェクトは学習用に作成されており、実際の本番環境に適用する際は、セキュリティ、パフォーマンス、監視などの追加要件を考慮してください。
