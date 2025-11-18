# Todo アプリ - CDK + Next.js

CDK を使用して、フルスタックの Todo アプリケーションを構築します。

## 構成

```
S3 (Next.js) → API Gateway → Lambda → DynamoDB
```

## 要件定義

### 機能要件

#### 1. Todo 一覧表示

- すべての Todo を一覧表示
- 完了/未完了のステータスを視覚的に表示
- 空の状態でも適切なメッセージを表示

#### 2. Todo 作成

- タイトルを入力して Todo を作成
- 作成時に自動的に ID とタイムスタンプを付与
- 作成後、一覧に即座に反映

#### 3. Todo 更新

- 完了/未完了のステータスをトグル
- タイトルの編集（オプション）

#### 4. Todo 削除

- 個別の Todo を削除
- 削除後、一覧から即座に削除

### 非機能要件

- **パフォーマンス**: API レスポンスタイム 200ms 以内
- **ユーザビリティ**: シンプルで直感的な UI
- **エラーハンドリング**: 適切なエラーメッセージ表示

### データモデル

```typescript
Todo {
  id: string;          // UUID
  title: string;       // Todoのタイトル
  completed: boolean;  // 完了フラグ
  createdAt: string;   // ISO8601形式のタイムスタンプ
  updatedAt: string;   // ISO8601形式のタイムスタンプ
}
```

### API 設計

#### GET /todos

- すべての Todo を取得
- レスポンス: `{ todos: Todo[] }`

#### POST /todos

- 新しい Todo を作成
- リクエスト: `{ title: string }`
- レスポンス: `{ todo: Todo }`

#### PUT /todos/{id}

- Todo のステータスを更新
- リクエスト: `{ completed: boolean }`
- レスポンス: `{ todo: Todo }`

#### DELETE /todos/{id}

- Todo を削除
- レスポンス: `{ message: string }`

## 実装ステップ

### Phase 1: インフラ構築 (CDK)

#### Step 1-1: DynamoDB テーブル作成 ✅

- [x] `lib/project-04-frontend-app-01-stack.ts` に DynamoDB テーブルを定義
- [x] パーティションキー: `id` (String)
- [x] `removalPolicy: DESTROY` で開発環境設定

#### Step 1-2: Lambda 関数作成 ✅

- [x] `lambda/todos/` ディレクトリを作成
- [x] CRUD 操作用の Lambda 関数を実装
  - [x] `getTodos.ts` - 一覧取得
  - [x] `createTodo.ts` - 作成
  - [x] `updateTodo.ts` - 更新
  - [x] `deleteTodo.ts` - 削除
- [x] DynamoDB SDK v3 を使用

#### Step 1-3: API Gateway 作成 ✅

- [x] REST API を作成
- [x] `/todos` リソースを作成
- [x] 各 HTTP メソッドと Lambda 関数を統合
- [x] CORS 設定を追加（重要！）

#### Step 1-4: S3 バケット作成 ✅

- [x] 静的ホスティング用の S3 バケットを作成
- [x] パブリックアクセス設定
- [x] BucketDeployment 設定（LocalStack では手動アップロード）

#### Step 1-5: デプロイとテスト ✅

- [x] `cdklocal bootstrap`
- [x] `cdklocal deploy`
- [x] API エンドポイント URL を確認
- [x] curl または VS Code REST Client で API をテスト
  - [x] GET /todos - 一覧取得
  - [x] POST /todos - 作成
  - [x] PUT /todos/{id} - 更新
  - [x] DELETE /todos/{id} - 削除

**API エンドポイント:** `https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/`

### Phase 2: フロントエンド実装 (Next.js) ✅

#### Step 2-1: 環境設定 ✅

- [x] `.env.local` に API エンドポイントを設定
- [x] API クライアント関数を作成（`lib/api/todoApi.ts`）

#### Step 2-2: UI コンポーネント作成 ✅

- [x] `TodoList` コンポーネント - 一覧表示
- [x] `TodoItem` コンポーネント - 個別 Todo（`data-testid`属性付き）
- [x] `TodoForm` コンポーネント - 新規作成フォーム

#### Step 2-3: 状態管理 ✅

- [x] SWR で Todo 一覧の状態管理
- [x] API 呼び出しとローディング状態
- [x] エラーハンドリング

#### Step 2-4: API 統合 ✅

- [x] フェッチ処理の実装
- [x] CRUD 操作の実装
- [x] **楽観的更新の実装**（SWR の mutate 機能）

#### Step 2-5: スタイリング ✅

- [x] Tailwind CSS でスタイリング
- [x] レスポンシブ対応
- [x] ダークモード対応（既存の ThemeProvider を活用）

### Phase 3: デプロイと動作確認 ✅

#### Step 3-1: ビルドとデプロイ ✅

- [x] Next.js アプリをビルド
- [x] S3 にアップロード（`./scripts/deploy-frontend.sh`）
- [x] ブラウザで動作確認

#### Step 3-2: 統合テスト（Playwright E2E） ✅

- [x] Todo 作成のテスト
- [x] Todo 一覧表示のテスト
- [x] Todo 完了/未完了の切り替えテスト
- [x] Todo 削除のテスト
- [x] ページリロード時の永続化テスト
- [x] 空 Todo のバリデーションテスト
- [x] 完了数カウンターのテスト

**全 7 テストが成功！** 🎉

#### Step 3-3: エラーケーステスト ✅

- [x] ネットワークエラー時の挙動（アラート表示）
- [x] 不正なデータ入力時の挙動（ボタン無効化）
- [x] API エラー時のユーザーフィードバック（再試行ボタン）

### Phase 4: 学習の振り返り ✅

- [x] README に学習内容をまとめる
- [x] 躓いたポイントと解決方法を記録
- [x] 次のプロジェクト（投票アプリ）への改善点を洗い出し

## プロジェクト構成

```
project-04-frontend-app-01/
├── lib/
│   └── project-04-frontend-app-01-stack.ts  # CDKスタック
├── lambda/
│   └── todos/
│       ├── getTodos.ts      # 一覧取得
│       ├── createTodo.ts    # 作成
│       ├── updateTodo.ts    # 更新
│       ├── deleteTodo.ts    # 削除
│       └── package.json     # AWS SDK依存関係
├── frontend-nextjs/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # ルートページ（/todosへリダイレクト）
│   │   │   └── todos/
│   │   │       └── page.tsx        # Todosメインページ
│   │   ├── components/
│   │   │   ├── TodoList.tsx        # Todo一覧コンテナ
│   │   │   ├── TodoItem.tsx        # 個別Todo（data-testid付き）
│   │   │   ├── TodoForm.tsx        # 作成フォーム
│   │   │   └── Navigation.tsx      # ナビゲーション
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── todoApi.ts      # APIクライアント（Singleton）
│   │   │   └── hooks/
│   │   │       └── useTodos.ts     # SWRカスタムフック
│   │   ├── store/
│   │   │   └── useTodoStore.ts     # Zustand（現在未使用）
│   │   └── types/
│   │       └── api.ts              # TypeScript型定義
│   ├── tests/
│   │   └── e2e/
│   │       └── todo.spec.ts        # Playwright E2Eテスト
│   ├── playwright.config.ts        # Playwrightテスト設定
│   ├── out/                         # ビルド成果物
│   └── package.json
├── scripts/
│   ├── deploy-frontend.sh          # S3デプロイスクリプト
│   └── build-and-deploy.sh         # ビルド+デプロイ一括実行
├── api-test.http                    # VS Code REST Client用テストファイル
└── README.md
```

## 学習ポイント

### 1. CORS 設定

LocalStack や AWS では、フロントエンド(S3)と API Gateway 間の通信に CORS 設定が必須です。

```typescript
// CDKでのCORS設定例
const api = new apigateway.RestApi(this, 'TodoApi', {
  defaultCorsPreflightOptions: {
    allowOrigins: apigateway.Cors.ALL_ORIGINS,
    allowMethods: apigateway.Cors.ALL_METHODS,
  },
});
```

### 2. DynamoDB の基本操作（AWS SDK v3）

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';

// クライアント初期化
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Scan - 全件取得
await docClient.send(new ScanCommand({ TableName: 'TodoTable' }));

// Put - 作成
await docClient.send(new PutCommand({ TableName: 'TodoTable', Item: todo }));

// Update - 更新
await docClient.send(
  new UpdateCommand({
    TableName: 'TodoTable',
    Key: { id },
    UpdateExpression: 'set completed = :completed',
    ExpressionAttributeValues: { ':completed': true },
  })
);

// Delete - 削除
await docClient.send(
  new DeleteCommand({ TableName: 'TodoTable', Key: { id } })
);
```

### 3. Lambda と API Gateway の統合

**重要な学び:**

- LocalStack では環境変数`AWS_ENDPOINT_URL`を明示的に設定する必要はない（自動設定される）
- Lambda プロキシ統合では、レスポンスに`statusCode`、`headers`、`body`が必須
- エラーハンドリングでは適切な HTTP ステータスコードを返す

```typescript
// Lambda関数のレスポンス形式
return {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({ todos }),
};
```

### 4. Next.js での API 呼び出しと SWR

**SWR による楽観的更新:**

```typescript
const { data, mutate } = useSWR('/todos', () => todoApi.getTodos());

// 楽観的更新: ローカルキャッシュを即座に更新
await mutate(
  updatedTodos,
  { revalidate: false } // サーバーに問い合わせない
);

// API呼び出し後にサーバーから最新データを取得
await todoApi.updateTodo(id, { completed });
await mutate(); // 再検証
```

**学んだこと:**

- Zustand + SWR の二重管理は不要（SWR 単体で十分）
- `revalidate: false`でチラつき防止
- エラー時は自動ロールバック

### 5. Playwright E2E テストのベストプラクティス

**`data-testid`属性の重要性:**

```tsx
// コンポーネント側
<div data-testid={`todo-item-${todo.id}`}>
  <input data-testid={`todo-checkbox-${todo.id}`} />
</div>;

// テスト側
const todoItem = page
  .locator('[data-testid^="todo-item-"]')
  .filter({ hasText: todoTitle });
const checkbox = todoItem.locator('[data-testid^="todo-checkbox-"]');
```

**LocalStack 特有の設定:**

- `timeout: 60000` - LocalStack は応答が遅いため
- `workers: 1` - 並列実行を避けて安定性向上
- `retries: 1` - 一時的なエラーに対応

### 6. LocalStack の制限と回避策

**BucketDeployment が動作しない:**

```bash
# CDKのBucketDeploymentは使えない
# 代わりに手動スクリプトを使用
./scripts/deploy-frontend.sh
```

**DynamoDB のデータがテスト間で残る:**

- テストは冪等性を意識
- カウンター系のテストは絶対値ではなくパターンマッチで検証

### 7. プロジェクト構成のベストプラクティス

**推奨:**

- インフラ（CDK）とフロントエンドは同じリポジトリ内で管理（モノレポ）
- スクリプトで自動化（`build-and-deploy.sh`）
- TypeScript 型定義を共有（`types/api.ts`）

**本番環境では:**

- インフラとフロントエンドを分離したリポジトリに
- CI/CD パイプラインで自動デプロイ
- 環境変数管理（AWS Systems Manager Parameter Store 等）

## API テスト方法

### 1. VS Code REST Client を使用（推奨）

`api-test.http` ファイルを開いて、各リクエストの上にある「Send Request」をクリック

### 2. curl コマンドを使用

```bash
# Todo一覧取得
curl -X GET https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos

# Todo作成
curl -X POST https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn CDK"}'

# Todo更新（completed状態を変更）
curl -X PUT https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos/{id} \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# Todo削除
curl -X DELETE https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos/{id}
```

## デプロイコマンド

### フロントエンドのデプロイ

```bash
# 方法1: ビルド+デプロイを一度に実行（推奨）
./scripts/build-and-deploy.sh

# 方法2: 既にビルド済みの場合、デプロイのみ
./scripts/deploy-frontend.sh
```

**注意:** LocalStack では`BucketDeployment`が動作しないため、`cdklocal deploy`後に手動でスクリプトを実行する必要があります。

### インフラのデプロイ

```bash
# 初回のみ: ブートストラップ
cdklocal bootstrap

# Lambda関数をビルド
cd lambda/todos && npm run build && cd ../..

# CDKスタックをデプロイ
cdklocal deploy

# フロントエンドをS3にアップロード（LocalStack用）
./scripts/deploy-frontend.sh
```

## Useful Commands

```bash
# CDK
cdklocal destroy          # スタックを削除
cdklocal diff             # 変更差分を確認
cdklocal synth            # CloudFormationテンプレートを生成

# Lambda関数のビルド
cd lambda/todos && npm run build && cd ../..

# Next.js（個別にビルド）
cd frontend-nextjs && npm run build && cd ..

# DynamoDB テーブル確認
awslocal dynamodb scan --table-name TodoTable

# S3バケットの内容確認
awslocal s3 ls s3://todo-app-bucket --recursive
```

## 躓いたポイントと解決方法

### 問題 1: Lambda 関数が DynamoDB に接続できない

**エラー:** `ECONNREFUSED 127.0.0.1:4566`

**原因:** Lambda 関数の環境変数に`AWS_ENDPOINT_URL`を明示的に設定していた

**解決策:** LocalStack は自動的にエンドポイントを設定するため、環境変数を削除

```typescript
// ❌ 削除前
const fn = new lambda.Function(this, 'GetTodos', {
  environment: {
    AWS_ENDPOINT_URL: 'http://localhost:4566', // これが原因
  },
});

// ✅ 削除後
const fn = new lambda.Function(this, 'GetTodos', {
  environment: {
    TABLE_NAME: table.tableName, // 必要な環境変数のみ
  },
});
```

### 問題 2: チェックボックスのチラつき

**現象:** チェックボックスをクリックすると、UI が一瞬チラつく

**原因:**

- Zustand と SWR で二重に状態管理
- `optimisticTodos`をクリアするタイミングで SWR データに切り替わる

**解決策:** SWR の`mutate`機能で楽観的更新を実装

```typescript
// ❌ Before: Zustand + SWRの二重管理
const optimisticTodos = useTodoStore((state) => state.optimisticTodos);
return { todos: optimisticTodos ?? data ?? [] };

// ✅ After: SWRのみで管理
await mutate(updatedTodos, { revalidate: false }); // 即座に更新
await todoApi.updateTodo(id, { completed }); // API呼び出し
await mutate(); // 再検証
```

### 問題 3: Playwright テストでセレクタが複数要素にマッチ

**エラー:** `strict mode violation: resolved to 23 elements`

**原因:**

- 前のテストで作成した Todo が残っている
- テキストベースのセレクタが複数の要素にマッチ

**解決策:** `data-testid`属性を追加

```tsx
// コンポーネントに一意な識別子を追加
<div data-testid={`todo-item-${todo.id}`}>
  <input data-testid={`todo-checkbox-${todo.id}`} />
  <button data-testid={`todo-delete-${todo.id}`}>削除</button>
</div>
```

### 問題 4: LocalStack で BucketDeployment が動作しない

**エラー:** デプロイは成功するが、S3 に何もアップロードされない

**原因:** LocalStack の制限

**解決策:** デプロイスクリプトを作成

```bash
#!/bin/bash
# scripts/deploy-frontend.sh
awslocal s3 rm s3://todo-app-bucket --recursive
awslocal s3 sync frontend-nextjs/out/ s3://todo-app-bucket/
```

## 次のプロジェクトへの改善点

### 技術選定

1. **状態管理は SWR 単体で十分** - Zustand は不要（複雑なアプリでは併用も可）
2. **Playwright は強力** - LocalStack でも十分動作する
3. **data-testid 属性は最初から** - 後から追加すると手間

### アーキテクチャ

1. **API 設計を先に固める** - 型定義から始めると開発がスムーズ
2. **環境変数管理を統一** - `.env.local`と`.env.example`を用意
3. **デプロイスクリプトを最初に作る** - 開発中も頻繁に使う

### テスト

1. **E2E テストは最小限に** - 重要なユーザーフローのみ
2. **API テストも書く** - Lambda の単体テストは必須
3. **テストデータのクリーンアップ** - beforeEach/afterEach で管理

## 成果物

### 動作する URL

- **フロントエンド:** http://todo-app-bucket.s3.localhost.localstack.cloud:4566/index.html
- **API:** https://rpreopc65q.execute-api.localhost.localstack.cloud:4566/prod/todos

### テスト結果

```bash
✅ 全7テスト成功 (13.4s)
  - ページタイトルが正しく表示される
  - Todoを作成できる
  - Todoを完了状態に変更できる
  - Todoを削除できる
  - 完了数が正しく表示される
  - 空のTodoは作成できない
  - ページをリロードしてもTodoが保持される
```

### 実装機能

- ✅ Todo CRUD（作成・読取・更新・削除）
- ✅ 楽観的更新（UI の即座な反応）
- ✅ エラーハンドリング（再試行ボタン付き）
- ✅ ローディング状態表示
- ✅ レスポンシブデザイン
- ✅ ダークモード対応
- ✅ E2E テスト完備

## まとめ

### 学んだこと

1. **CDK + LocalStack での開発フロー** - 本番に近い環境で開発可能
2. **AWS SDK v3 の使い方** - DynamoDB 操作の基本
3. **Next.js App Router の実践** - Server/Client Component の使い分け
4. **SWR による状態管理** - 楽観的更新の実装
5. **Playwright による自動テスト** - E2E テストの重要性

### 所要時間

- Phase 1（インフラ）: 約 2 時間
- Phase 2（フロントエンド）: 約 3 時間
- Phase 3（テスト）: 約 2 時間
- **合計: 約 7 時間**

### 次のステップ

このプロジェクトで学んだパターンを活用して、次の「投票アプリ」「チャットアプリ」に進みます！

## Useful commands

### CDK

- `cdklocal bootstrap` - CDK 環境をブートストラップ
- `cdklocal deploy` - スタックをデプロイ
- `cdklocal destroy` - スタックを削除
- `cdklocal diff` - デプロイ済みスタックとの差分を確認
- `cdklocal synth` - CloudFormation テンプレートを生成

### Lambda

- `cd lambda/todos && npm run build` - Lambda 関数をビルド

### Frontend

- `cd frontend-nextjs && npm run build` - Next.js アプリをビルド
- `cd frontend-nextjs && npm run dev` - 開発サーバー起動
- `cd frontend-nextjs && npm run test:e2e` - E2E テスト実行
- `cd frontend-nextjs && npm run test:e2e:ui` - E2E テスト UI モード

### Deploy

- `./scripts/build-and-deploy.sh` - ビルド+デプロイ一括実行
- `./scripts/deploy-frontend.sh` - フロントエンドのみデプロイ

### AWS CLI (LocalStack)

- `awslocal dynamodb scan --table-name TodoTable` - DynamoDB 全件取得
- `awslocal s3 ls s3://todo-app-bucket --recursive` - S3 バケット内容確認
- `awslocal apigateway get-rest-apis` - API Gateway 一覧
