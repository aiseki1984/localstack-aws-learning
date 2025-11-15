# CDK Posts API Project

API Gateway + Lambda + DynamoDB で投稿 CRUD アプリを作成する CDK プロジェクトです。

## プロジェクト構成

```
project-03-cdk-basic/
├── bin/                    # CDK アプリのエントリーポイント
├── lib/                    # CDK スタック定義
├── lambda/                 # Lambda 関数のソースコード
│   ├── src/
│   │   └── index.ts       # Lambda ハンドラー
│   └── dist/              # ビルド後のコード
├── test/                   # テストコード
└── cdk.json               # CDK 設定ファイル
```

## セットアップ手順

### ステップ 1: Lambda 関数の準備 ✅

Lambda 関数は既にセットアップ済みです。

- `lambda/src/index.ts` - Lambda ハンドラー（最小構成）
- `lambda/dist/index.js` - ビルド済みコード

### ステップ 2: CDK スタックの作成

次に、`lib/project-03-cdk-basic-stack.ts` を編集して以下のリソースを定義します：

1. **DynamoDB テーブル** - 投稿データを保存
2. **Lambda 関数** - CRUD 操作を処理
3. **API Gateway** - REST API エンドポイント
4. **IAM ロール** - Lambda に DynamoDB へのアクセス権限を付与

### ステップ 3: CDK スタックのビルド

CDK プロジェクトをビルドします：

```bash
cd /workspace/playground/project-03-cdk-basic
npm run build
```

### ステップ 4: CloudFormation テンプレートの確認

CDK が生成する CloudFormation テンプレートを確認：

```bash
npx cdk synth
```

### ステップ 5: デプロイ

スタックをデプロイします：

```bash
npx cdk deploy
```

### ステップ 6: 動作確認

デプロイ後、API エンドポイントが出力されます。curl や HTTP クライアントでテストします。

## API エンドポイント

| メソッド | パス        | 説明         |
| -------- | ----------- | ------------ |
| POST     | /posts      | 新規投稿作成 |
| GET      | /posts      | 全投稿取得   |
| GET      | /posts/{id} | 特定投稿取得 |
| PUT      | /posts/{id} | 投稿更新     |
| DELETE   | /posts/{id} | 投稿削除     |

## CDK コマンド

- `npm run build` - TypeScript を JavaScript にコンパイル
- `npm run watch` - 変更を監視して自動コンパイル
- `npm run test` - Jest ユニットテストを実行
- `npx cdk deploy` - スタックをデプロイ
- `npx cdk diff` - デプロイ済みスタックと現在の差分を表示
- `npx cdk synth` - CloudFormation テンプレートを生成
- `npx cdk destroy` - スタックを削除

## 次のステップ

👉 **今ここ**: CDK スタックにリソースを定義していきましょう！

`lib/project-03-cdk-basic-stack.ts` を編集して、DynamoDB、Lambda、API Gateway を追加します。

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `npx cdk deploy` deploy this stack to your default AWS account/region
- `npx cdk diff` compare deployed stack with current state
- `npx cdk synth` emits the synthesized CloudFormation template
