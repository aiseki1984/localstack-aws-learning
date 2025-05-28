# SAM Lambda + API Gateway セットアップガイド

## 概要

このガイドでは、AWS SAM (Serverless Application Model) を使用して Lambda 関数と API Gateway を構築する手順を説明します。LocalStack 環境で Hello World アプリケーションを作成・デプロイします。

## 前提条件

### 必要なツール

- Docker & Docker Compose
- LocalStack（コンテナ環境）
- SAM CLI（コンテナ内にインストール済み）
- Node.js 20.x（コンテナ内）

### 環境確認

```bash
# LocalStackコンテナ内での確認
docker-compose exec localstack_client bash

# ツールバージョン確認
sam --version
node --version
npm --version
aws --version
```

## ステップ 1: プロジェクト初期化

### SAM プロジェクト作成

```bash
# ワークスペースディレクトリに移動
cd /workspace

# SAMプロジェクト初期化（Hello World テンプレート）
sam init
```

### 初期化プロンプトへの回答

```
Which template source would you like to use?
        1 - AWS Quick Start Templates
        2 - Custom Template Location
Choice: 1

Choose an AWS Quick Start application template
        1 - Hello World Example
        2 - Multi-step workflow
        3 - Serverless API
        4 - Scheduled task
        5 - Standalone function
        6 - Data processing
        7 - Infrastructure event management
        8 - Lambda Response Streaming
        9 - Serverless Connector Hello World Example
        10 - Multi-step workflow with Connectors
        11 - Lambda EFS example
        12 - Machine Learning
Template selection: 1

Use the most popular runtime and package type? (Python and zip) [y/N]: N

Which runtime would you like to use?
        1 - aot.dotnet7 (provided.al2)
        2 - dotnet6
        3 - dotnet8
        4 - go1.x
        5 - go (provided.al2)
        6 - go (provided.al2023)
        7 - graalvm.java11 (provided.al2)
        8 - graalvm.java17 (provided.al2)
        9 - graalvm.java21 (provided.al2)
        10 - java11
        11 - java17
        12 - java21
        13 - nodejs18.x
        14 - nodejs20.x
        15 - python3.9
        16 - python3.10
        17 - python3.11
        18 - python3.12
        19 - ruby3.2
        20 - rust (provided.al2)
Runtime: 14

What package type would you like to use?
        1 - Zip
        2 - Image
Package type: 1

Based on your selections, the only dependency manager available is npm.
We will proceed copying the template using npm.

Would you like to enable X-Ray tracing on the function(s) in your application?  [y/N]: N

Would you like to enable monitoring using CloudWatch Application Insights?
For more info, please view https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-application-insights.html [y/N]: N

Project name [sam-app]: project-03-sam-lambda-api
```

## ステップ 2: プロジェクト構造確認

### 生成されたファイル構造

```bash
cd project-03-sam-lambda-api
tree
```

**期待される出力:**

```
project-03-sam-lambda-api/
├── README.md
├── events/
│   └── event.json
├── hello-world/
│   ├── app.mjs
│   ├── package.json
│   └── tests/
│       └── unit/
│           └── test-handler.mjs
└── template.yaml
```

### キーファイルの内容確認

#### template.yaml (SAM テンプレート)

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  project-03-sam-lambda-api

  Sample SAM Template for project-03-sam-lambda-api

Globals:
  Function:
    Timeout: 3

Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: hello-world/
      Handler: app.lambdaHandler
      Runtime: nodejs20.x
      Architectures:
        - x86_64
      Events:
        HelloWorld:
          Type: Api
          Properties:
            Path: /hello
            Method: get

Outputs:
  HelloWorldApi:
    Description: 'API Gateway endpoint URL for Prod stage for Hello World function'
    Value: !Sub 'https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/hello/'
  HelloWorldFunction:
    Description: 'Hello World Lambda Function ARN'
    Value: !GetAtt HelloWorldFunction.Arn
  HelloWorldFunctionIamRole:
    Description: 'Implicit IAM Role created for Hello World function'
    Value: !GetAtt HelloWorldFunctionRole.Arn
```

#### hello-world/app.mjs (Lambda 関数)

```javascript
export const lambdaHandler = async (event, context) => {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'hello world',
      }),
    };
  } catch (err) {
    console.log(err);
    return err;
  }
};
```

## ステップ 3: アプリケーションビルド

### SAM ビルド実行

```bash
cd /workspace/project-03-sam-lambda-api
sam build
```

**期待される出力:**

```
Building codeuri: /workspace/project-03-sam-lambda-api/hello-world runtime: nodejs20.x metadata: {} architecture: x86_64 functions: HelloWorldFunction
Running NodejsNpmBuilder:NpmPack
Running NodejsNpmBuilder:CopyNpmrcAndLockfile
Running NodejsNpmBuilder:CopySource
Running NodejsNpmBuilder:NpmInstall
Running NodejsNpmBuilder:CleanUpNpmrc
Running NodejsNpmBuilder:LockfileCleanUp
Running NodejsNpmBuilder:LinkSourceFiles

Build Succeeded

Built Artifacts  : .aws-sam/build
Built Template   : .aws-sam/build/template.yaml

Commands you can use next
=========================
[*] Validate SAM template: sam validate
[*] Invoke Function: sam local invoke
[*] Test Function in the Cloud: sam sync --stack-name {{stack-name}} --watch
[*] Deploy: sam deploy --guided
```

### ビルド結果確認

```bash
# ビルド済みファイル構造
tree .aws-sam/build
```

## ステップ 4: LocalStack へデプロイ

### 初回デプロイ（ガイド付き）

```bash
sam deploy --guided
```

### デプロイプロンプトへの回答

```
Configuring SAM deploy
======================

        Looking for config file [samconfig.toml] :  Not found

        Setting default arguments for 'sam deploy'
        =========================================
        Stack Name [sam-app]: sam-app-desu
        AWS Region [us-east-1]: us-east-1
        #Shows you resources changes to be deployed and require a 'Y' to initiate deploy
        Confirm changes before deploy [y/N]: N
        #SAM needs permission to be able to create roles to connect to the resources in your template
        Allow SAM to create IAM roles [Y/n]: Y
        #Preserves the state of previously provisioned resources when an operation fails
        Disable rollback [y/N]: N
        HelloWorldFunction may not have authorization defined, Is this okay? [y/N]: Y
        Save parameters to config file [Y/n]: Y
        SAM configuration file [samconfig.toml]: samconfig.toml
        SAM configuration environment [default]: default

        Looking for resources needed for deployment:
         Managed S3 bucket: aws-sam-cli-managed-default-samclisourcebucket-localstack
         A different default S3 bucket can be set in samconfig.toml

        Saved arguments to config file
        Running 'sam deploy' for future deployments will use the parameters saved above.
        The above parameters can be changed by modifying samconfig.toml
        Learn more about samconfig.toml syntax at
        https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html
```

**期待される出力:**

```
Deploying with following values
===============================
Stack name                   : sam-app-desu
Region                       : us-east-1
Confirm changeset            : False
Disable rollback             : False
Deployment s3 bucket         : aws-sam-cli-managed-default-samclisourcebucket-localstack
Capabilities                 : ["CAPABILITY_IAM"]
Parameter overrides          : {}
Signing Profiles             : {}

Initiating deployment
=====================

Uploading to sam-app-desu/372f7acea0b2a5b1af7e6db4b0e0b1a3  668 / 668  (100.00%)

Waiting for changeset to be created..

CloudFormation stack changeset
-------------------------------------------------------------------------------------------------
Operation                     LogicalId                     ResourceType                  Replacement
-------------------------------------------------------------------------------------------------
+ Add                         HelloWorldFunctionHelloWorldPermissionProd   AWS::Lambda::Permission       N/A
+ Add                         HelloWorldFunctionRole        AWS::IAM::Role                N/A
+ Add                         HelloWorldFunction            AWS::Lambda::Function         N/A
+ Add                         ServerlessRestApiDeployment47fc2d5f9d        AWS::ApiGateway::Deployment   N/A
+ Add                         ServerlessRestApiProdStage    AWS::ApiGateway::Stage        N/A
+ Add                         ServerlessRestApi             AWS::ApiGateway::RestApi      N/A
-------------------------------------------------------------------------------------------------

Changeset created successfully. arn:aws:cloudformation:us-east-1:000000000000:changeSet/samcli-deploy1732890982/8a38e79a-5f1d-4c81-9b7b-dc0a04c71b8b


2024-11-29 14:49:48 - Waiting for stack create/update to complete

CloudFormation events from stack operations (refresh every 5.0 seconds)
-------------------------------------------------------------------------------------------------
ResourceStatus                ResourceType                  LogicalId                     ResourceStatusReason
-------------------------------------------------------------------------------------------------
CREATE_IN_PROGRESS            AWS::CloudFormation::Stack    sam-app-desu                  User Initiated
CREATE_IN_PROGRESS            AWS::IAM::Role                HelloWorldFunctionRole        -
CREATE_IN_PROGRESS            AWS::IAM::Role                HelloWorldFunctionRole        Resource creation Initiated
CREATE_COMPLETE               AWS::IAM::Role                HelloWorldFunctionRole        -
CREATE_IN_PROGRESS            AWS::Lambda::Function         HelloWorldFunction            -
CREATE_IN_PROGRESS            AWS::Lambda::Function         HelloWorldFunction            Resource creation Initiated
CREATE_COMPLETE               AWS::Lambda::Function         HelloWorldFunction            -
CREATE_IN_PROGRESS            AWS::ApiGateway::RestApi      ServerlessRestApi             -
CREATE_IN_PROGRESS            AWS::ApiGateway::RestApi      ServerlessRestApi             Resource creation Initiated
CREATE_COMPLETE               AWS::ApiGateway::RestApi      ServerlessRestApi             -
CREATE_IN_PROGRESS            AWS::Lambda::Permission       HelloWorldFunctionHelloWorldPermissionProd   -
CREATE_IN_PROGRESS            AWS::ApiGateway::Deployment   ServerlessRestApiDeployment47fc2d5f9d        -
CREATE_IN_PROGRESS            AWS::Lambda::Permission       HelloWorldFunctionHelloWorldPermissionProd   Resource creation Initiated
CREATE_IN_PROGRESS            AWS::ApiGateway::Deployment   ServerlessRestApiDeployment47fc2d5f9d        Resource creation Initiated
CREATE_COMPLETE               AWS::Lambda::Permission       HelloWorldFunctionHelloWorldPermissionProd   -
CREATE_COMPLETE               AWS::ApiGateway::Deployment   ServerlessRestApiDeployment47fc2d5f9d        -
CREATE_IN_PROGRESS            AWS::ApiGateway::Stage        ServerlessRestApiProdStage    -
CREATE_IN_PROGRESS            AWS::ApiGateway::Stage        ServerlessRestApiProdStage    Resource creation Initiated
CREATE_COMPLETE               AWS::ApiGateway::Stage        ServerlessRestApiProdStage    -
CREATE_COMPLETE               AWS::CloudFormation::Stack    sam-app-desu                  -
-------------------------------------------------------------------------------------------------

CloudFormation outputs from deployed stack
-------------------------------------------------------------------------------------------------
Outputs
-------------------------------------------------------------------------------------------------
Key                 HelloWorldApi
Description         API Gateway endpoint URL for Prod stage for Hello World function
Value               https://97kpcfv5ou.execute-api.us-east-1.amazonaws.com/Prod/hello/

Key                 HelloWorldFunction
Description         Hello World Lambda Function ARN
Value               arn:aws:lambda:us-east-1:000000000000:function:sam-app-desu-HelloWorldFunction-83dbe99b

Key                 HelloWorldFunctionIamRole
Description         Implicit IAM Role created for Hello World function
Value               arn:aws:iam::000000000000:role/sam-app-desu-HelloWorldFunctionRole-8c7c35c4
-------------------------------------------------------------------------------------------------

Successfully created/updated stack - sam-app-desu in us-east-1
```

### 生成された設定ファイル確認

```bash
cat samconfig.toml
```

**期待される内容:**

```toml
# More information about the configuration file can be found here:
# https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html
version = 0.1

[default]
[default.deploy]
[default.deploy.parameters]
stack_name = "sam-app-desu"
s3_bucket = "aws-sam-cli-managed-default-samclisourcebucket-localstack"
s3_prefix = "sam-app-desu"
region = "us-east-1"
capabilities = "CAPABILITY_IAM"
disable_rollback = true
parameter_overrides = ""
image_repositories = []
```

## ステップ 5: API 動作確認

### エンドポイント情報取得

```bash
# CloudFormationスタック情報確認
aws cloudformation describe-stacks --stack-name sam-app-desu --query 'Stacks[0].Outputs'
```

### API テスト

```bash
# LocalStack環境でのAPIテスト
curl -X GET "http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello"
```

**期待されるレスポンス:**

```json
{ "message": "hello world" }
```

### AWS リソース確認

```bash
# Lambda関数一覧
aws lambda list-functions

# API Gateway一覧
aws apigateway get-rest-apis

# CloudFormationスタック確認
aws cloudformation list-stacks
```

## ステップ 6: ローカル開発・テスト（オプション）

### ローカル API 起動

```bash
# ローカルでAPI Gateway エミュレート
sam local start-api
```

### ローカル関数実行

```bash
# 直接Lambda関数を実行
sam local invoke HelloWorldFunction --event events/event.json
```

## ステップ 7: リソース削除

### SAM スタック削除

```bash
sam delete --stack-name sam-app-desu
```

### 削除確認

```bash
# スタック削除確認
aws cloudformation list-stacks --stack-status-filter DELETE_COMPLETE

# Lambda関数確認（削除されていることを確認）
aws lambda list-functions

# API Gateway確認（削除されていることを確認）
aws apigateway get-rest-apis
```

## トラブルシューティング

### よくある問題

#### 1. SAM CLI が見つからない

```bash
# コンテナ内でSAM CLIインストール確認
which sam
sam --version
```

#### 2. Node.js バージョン不一致

```bash
# Node.jsバージョン確認
node --version  # v20.19.2 である必要
```

#### 3. LocalStack 接続エラー

```bash
# LocalStack動作確認
aws --endpoint-url=http://localstack:4566 sts get-caller-identity
```

#### 4. デプロイ失敗

```bash
# 詳細ログでデプロイ
sam deploy --debug

# スタック状態確認
aws cloudformation describe-stacks --stack-name sam-app-desu
```

## 次のステップ

1. **カスタム Lambda 関数**: Hello World 以外の機能実装
2. **環境変数設定**: 設定値の外部化
3. **データベース連携**: DynamoDB 統合
4. **認証機能**: API 認証の追加
5. **CI/CD**: 自動デプロイパイプライン構築

## SAM vs Terraform 比較

| 項目             | SAM                   | Terraform (project-02) |
| ---------------- | --------------------- | ---------------------- |
| **設定ファイル** | template.yaml (30 行) | main.tf (80 行)        |
| **リソース数**   | 6 個（自動生成）      | 9 個（手動定義）       |
| **IAM 設定**     | 自動生成              | 手動定義               |
| **デプロイ**     | `sam deploy`          | `terraform apply`      |
| **削除**         | `sam delete`          | `terraform destroy`    |
| **学習コスト**   | 低                    | 中                     |
| **柔軟性**       | 中                    | 高                     |
