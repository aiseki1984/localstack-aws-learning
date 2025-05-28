# SAM (Serverless Application Model) 基礎知識

## SAM とは？

AWS SAM (Serverless Application Model) は、サーバーレスアプリケーションを構築・デプロイするためのオープンソースフレームワークです。CloudFormation の拡張として動作し、サーバーレスリソースの定義を簡潔に記述できます。

## SAM の特徴

### 1. 簡潔な構文

- CloudFormation の冗長な記述を簡略化
- サーバーレス特化の専用リソースタイプ
- 少ないコードで多くのリソースを定義可能

### 2. ローカル開発・テスト

```bash
sam local start-api    # ローカルAPIサーバー起動
sam local invoke       # ローカルLambda実行
sam local start-lambda # Lambdaランタイムエミュレート
```

### 3. 自動リソース作成

- IAM ロールの自動生成
- API Gateway との自動統合
- CloudWatch ログ設定の自動化

## SAM vs Terraform 比較

| 項目               | SAM            | Terraform            |
| ------------------ | -------------- | -------------------- |
| **学習コスト**     | 低（AWS 特化） | 中（汎用的）         |
| **記述量**         | 少ない         | 多い（詳細制御可能） |
| **AWS 統合**       | 最適化済み     | 手動設定が必要       |
| **マルチクラウド** | AWS 専用       | 対応                 |
| **ローカル開発**   | 充実           | 限定的               |
| **細かい制御**     | 限定的         | 高い                 |

## SAM の主要リソースタイプ

### 1. AWS::Serverless::Function

Lambda 関数の定義

```yaml
Type: AWS::Serverless::Function
Properties:
  Runtime: nodejs20.x
  Handler: app.lambdaHandler
  CodeUri: hello-world/
  Events:
    HelloWorld:
      Type: Api
      Properties:
        Path: /hello
        Method: get
```

### 2. AWS::Serverless::Api

API Gateway の定義

```yaml
Type: AWS::Serverless::Api
Properties:
  StageName: Prod
  Cors:
    AllowOrigin: "'*'"
    AllowHeaders: "'*'"
```

### 3. AWS::Serverless::SimpleTable

DynamoDB テーブルの定義

```yaml
Type: AWS::Serverless::SimpleTable
Properties:
  PrimaryKey:
    Name: id
    Type: String
```

## SAM ワークフロー

### 1. 初期化

```bash
sam init                    # プロジェクト初期化
sam init --runtime nodejs20.x --name my-app
```

### 2. 開発・テスト

```bash
sam build                   # アプリケーションビルド
sam local start-api         # ローカルAPI起動
sam local invoke            # 関数実行テスト
```

### 3. デプロイ

```bash
sam deploy --guided         # ガイド付きデプロイ
sam deploy                  # 設定済みデプロイ
```

### 4. 管理・削除

```bash
sam logs -n HelloWorldFunction --stack-name sam-app
sam delete --stack-name sam-app
```

## SAM テンプレートの基本構造

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  SAMアプリケーションの説明

# パラメータ（オプション）
Parameters:
  Stage:
    Type: String
    Default: dev

# グローバル設定
Globals:
  Function:
    Runtime: nodejs20.x
    Timeout: 30
    Environment:
      Variables:
        STAGE: !Ref Stage

# リソース定義
Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: hello-world/
      Handler: app.lambdaHandler
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get

# 出力値
Outputs:
  HelloWorldApi:
    Description: 'API Gateway endpoint URL'
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/hello/'
```

## LocalStack との統合

SAM は LocalStack と完全に統合されており、本番環境と同じワークフローでローカル開発が可能です：

```bash
# LocalStack環境でのデプロイ
sam deploy --guided \
  --parameter-overrides 'ParameterKey=Stage,ParameterValue=local' \
  --region us-east-1 \
  --s3-bucket sam-deployments \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset
```

## ベストプラクティス

### 1. プロジェクト構造

```
my-sam-app/
├── template.yaml          # SAMテンプレート
├── samconfig.toml         # デプロイ設定
├── src/
│   └── handlers/          # Lambda関数
├── events/                # テストイベント
└── tests/                 # ユニットテスト
```

### 2. 環境管理

- 環境別パラメータファイルの利用
- samconfig.toml での環境別設定
- CloudFormation パラメータの活用

### 3. セキュリティ

- 最小権限の原則
- 環境変数での機密情報管理
- VPC 設定（必要に応じて）

## SAM の利点

1. **開発効率**: CloudFormation より簡潔
2. **AWS 統合**: ベストプラクティスが組み込み済み
3. **ローカル開発**: 本格的なローカル環境
4. **デプロイ簡素化**: ワンコマンドデプロイ
5. **モニタリング**: CloudWatch との自動統合

## 次のステップ

1. **複雑なアプリケーション**: 複数の Lambda 関数
2. **データベース統合**: DynamoDB、RDS
3. **認証・認可**: Cognito、Lambda Authorizer
4. **CI/CD**: CodePipeline、GitHub Actions
5. **モニタリング**: X-Ray、CloudWatch Insights
