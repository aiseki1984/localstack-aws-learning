# Lambda Function Setup

このディレクトリには、投稿 CRUD 操作を行う Lambda 関数のコードが含まれています。

## セットアップ手順

### 1. package.json の作成

まず、`package.json` を作成します：

```bash
cd /workspace/playground/project-03-cdk-basic/lambda
```

```bash
npm init -y
```

### 2. 依存関係のインストール

#### 本番依存関係

DynamoDB クライアントをインストールします：

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

#### 開発依存関係

TypeScript と型定義をインストールします：

```bash
npm install --save-dev typescript @types/node @types/aws-lambda
```

ビルドツール（esbuild）とテストツール（vitest）をインストールします：

```bash
npm install --save-dev esbuild
```

```bash
npm install --save-dev vitest
```

### 3. esbuild を使う理由

- **バンドル**: 複数のファイルを 1 つにまとめてデプロイサイズを削減
- **高速ビルド**: TypeScript のビルドが tsc より圧倒的に速い
- **Minify**: コードを圧縮してサイズを最小化
- **依存関係の最適化**: `--external:@aws-sdk/*` で AWS SDK を除外（Lambda 環境に既に存在）

### 4. TypeScript の設定

`tsconfig.json` を作成して、TypeScript のコンパイル設定を行います。

### 5. package.json の scripts セクションを更新

以下のスクリプトを `package.json` に追加します：

```json
"scripts": {
  "build": "esbuild src/index.ts --bundle --minify --platform=node --target=es2020 --outfile=dist/index.js --external:@aws-sdk/*",
  "build:watch": "npm run build -- --watch",
  "test": "vitest run",
  "test:watch": "vitest --watch",
  "typecheck": "tsc --noEmit"
}
```

### 6. ソースコードの作成

`src/index.ts` に Lambda 関数のコードを作成します。

```ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Lambda ハンドラー関数
 * API Gateway からのリクエストを受け取り、レスポンスを返す
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Hello from Lambda!',
      path: event.path,
      method: event.httpMethod,
    }),
  };
};
```

### 7. ビルド

esbuild でバンドル・最適化します：

```bash
npm run build
```

### 8. テスト実行

vitest でテストを実行します：

```bash
npm run test
```

## プロジェクト構造

```
lambda/
├── README.md          # このファイル
├── package.json       # 依存関係の定義
├── tsconfig.json      # TypeScript 設定
├── src/
│   └── index.ts       # Lambda 関数のソースコード
└── dist/              # ビルド後の JavaScript (npm run build で生成)
    └── index.js
```

## 環境変数

Lambda 関数は以下の環境変数を使用します：

- `TABLE_NAME`: DynamoDB テーブル名（CDK が自動的に設定）

## API エンドポイント

- `POST /posts` - 新規投稿作成
- `GET /posts` - 全投稿取得
- `GET /posts/{id}` - 特定投稿取得
- `PUT /posts/{id}` - 投稿更新
- `DELETE /posts/{id}` - 投稿削除
