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

#### 方法 A: CDK 標準デプロイ（通常の環境）

```bash
npx cdk deploy
```

⚠️ **注意**: CDK デプロイには Bootstrap が必要です。初回のみ：

```bash
npx cdk bootstrap
```

#### 方法 B: CloudFormation 直接デプロイ（devcontainer/LocalStack 環境推奨）

CDK が生成した CloudFormation テンプレートを使って直接デプロイします。この方法では Bootstrap が不要です。

```bash
# すべて自動実行（Lambda ビルド → S3 アップロード → デプロイ）
./scripts/deploy.sh
```

**deploy.sh の処理内容**：

1. Lambda 関数をビルド（esbuild）
2. Lambda コードを ZIP に圧縮
3. S3 バケットを作成
4. Lambda コードを S3 にアップロード
5. `cdk synth` で CloudFormation テンプレートを生成
6. テンプレートを修正（Lambda コードパスを S3 に変更、Bootstrap パラメータ削除）
7. CloudFormation でスタックをデプロイ

### ステップ 6: リソース確認

デプロイされたリソースを確認：

```bash
./scripts/list-resources.sh
```

### ステップ 7: API 動作確認

API をテストします：

```bash
./scripts/test-api.sh
```

このスクリプトは CRUD 操作（作成、取得、更新、削除）を順番に実行します。

## API エンドポイント

| メソッド | パス        | 説明         |
| -------- | ----------- | ------------ |
| POST     | /posts      | 新規投稿作成 |
| GET      | /posts      | 全投稿取得   |
| GET      | /posts/{id} | 特定投稿取得 |
| PUT      | /posts/{id} | 投稿更新     |
| DELETE   | /posts/{id} | 投稿削除     |

## CDK コマンド

### 基本コマンド

- `npm run build` - TypeScript を JavaScript にコンパイル
- `npm run watch` - 変更を監視して自動コンパイル
- `npm run test` - Jest ユニットテストを実行
- `npx cdk synth` - CloudFormation テンプレートを生成（`cdk.out/` に出力）
- `npx cdk diff` - デプロイ済みスタックと現在の差分を表示
- `npx cdk deploy` - スタックをデプロイ（Bootstrap 必要）
- `npx cdk destroy` - スタックを削除

### カスタムスクリプト（scripts/ ディレクトリ）

以下のスクリプトは、どのディレクトリからでも実行可能です：

```bash
# デプロイ（CloudFormation 直接）
./scripts/deploy.sh

# リソース確認
./scripts/list-resources.sh

# API テスト
./scripts/test-api.sh

# クリーンアップ（スタック削除）
./scripts/cleanup.sh
```

## CDK vs CloudFormation 直接デプロイの違い

### CDK デプロイ（`npx cdk deploy`）

**メリット**：

- CDK の機能をフル活用（アセット管理、自動的な依存関係解決）
- 本番環境での推奨方法

**必要なもの**：

- CDK Bootstrap（初回のみ `npx cdk bootstrap`）
- 適切な AWS 認証情報

### CloudFormation 直接デプロイ（`./scripts/deploy.sh`）

**メリット**：

- Bootstrap 不要
- devcontainer や LocalStack 環境で動作確認が容易
- デプロイプロセスが可視化されている

**仕組み**：

1. `npx cdk synth` で CloudFormation テンプレート生成
2. テンプレートを編集（Lambda コードを S3 パスに変更）
3. `aws cloudformation deploy` で直接デプロイ

**使用例**：

- 学習目的
- LocalStack でのテスト
- CDK の内部動作を理解したい場合

## プロジェクトの状態

✅ **完了**：

- CDK スタック定義（DynamoDB + Lambda + API Gateway）
- Lambda 関数（最小構成）
- デプロイスクリプト
- リソース確認スクリプト
- API テストスクリプト

🔄 **次のステップ（オプション）**：

- Lambda 関数に DynamoDB CRUD 処理を実装
- エラーハンドリングの改善
- テストケースの追加

## CDK local

cdklocal をインストールしているので、それで実行する。

```bash
cdklocal bootstrap
cdklocal deploy

# リソースの確認
awslocal cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE
awslocal cloudformation describe-stack-resources --stack-name Project03CdkBasicStack
awslocal lambda list-functions --query 'Functions[*].[FunctionName,Runtime,Handler]' --output table
```

### 確認コマンド

```bash
# すべてのスタックを確認
awslocal cloudformation list-stacks

# 特定のスタックのリソースを確認
awslocal cloudformation describe-stack-resources --stack-name Project03CdkBasicStack

# Lambda関数一覧
awslocal lambda list-functions

# DynamoDBテーブル一覧
awslocal dynamodb list-tables

# API Gateway一覧
awslocal apigateway get-rest-apis
```
