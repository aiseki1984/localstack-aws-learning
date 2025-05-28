# SAM Lambda + API Gateway 実行ログ

## 実行環境

- **実行日時**: 2024 年 11 月 29 日
- **環境**: LocalStack + Docker
- **Node.js**: v20.19.2
- **SAM CLI**: v1.127.0
- **AWS CLI**: v2.13.25

## 1. 環境確認

### コンテナアクセス

```bash
$ cd /Users/pakupaku/_workspace/cicd/localstack-learning-2
$ docker-compose exec localstack_client bash
```

### ツールバージョン確認

```bash
root@b8a469f80fc6:/workspace# sam --version
SAM CLI, version 1.127.0

root@b8a469f80fc6:/workspace# node --version
v20.19.2

root@b8a469f80fc6:/workspace# npm --version
10.8.2

root@b8a469f80fc6:/workspace# aws --version
aws-cli/2.13.25 Python/3.11.5 Linux/6.6.26-linuxkit exe/x86_64.ubuntu.22 prompt/off
```

## 2. SAM プロジェクト初期化

### sam init 実行

```bash
root@b8a469f80fc6:/workspace# sam init
You can preselect a particular runtime or package type by using the `--runtime` or `--package-type` parameters.

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

Cloning from https://github.com/aws/aws-sam-cli-app-templates (process may take a moment)

    -----------------------
    Generating application:
    -----------------------
    Name: project-03-sam-lambda-api
    Runtime: nodejs20.x
    Architectures: ['x86_64']
    Dependency Manager: npm
    Application Template: hello-world
    Output Directory: .
    Configuration file: project-03-sam-lambda-api/samconfig.toml

    Next steps can be found in the README file at project-03-sam-lambda-api/README.md


Commands you can use next
=========================
[*] Create pipeline: cd project-03-sam-lambda-api && sam pipeline init --bootstrap
[*] Validate SAM template: cd project-03-sam-lambda-api && sam validate
[*] Test Function in the Cloud: cd project-03-sam-lambda-api && sam sync --stack-name {stack-name} --watch
```

### プロジェクト構造確認

```bash
root@b8a469f80fc6:/workspace# cd project-03-sam-lambda-api
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# tree
.
├── README.md
├── events
│   └── event.json
├── hello-world
│   ├── app.mjs
│   ├── package.json
│   └── tests
│       └── unit
│           └── test-handler.mjs
└── template.yaml

3 directories, 6 files
```

## 3. ファイル内容確認

### template.yaml

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# cat template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: >
  project-03-sam-lambda-api

  Sample SAM Template for project-03-sam-lambda-api

# More info about Globals: https://github.com/awslabs/serverless-application-model/blob/master/docs/globals.rst
Globals:
  Function:
    Timeout: 3
    # Tracing: Active  # https://docs.aws.amazon.com/lambda/latest/dg/lambda-x-ray.html

Resources:
  HelloWorldFunction:
    Type: AWS::Serverless::Function # More info about Function Resource: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#awsserverlessfunction
    Properties:
      CodeUri: hello-world/
      Handler: app.lambdaHandler
      Runtime: nodejs20.x
      Architectures:
        - x86_64
      Events:
        HelloWorld:
          Type: Api # More info about API Event Source: https://github.com/awslabs/serverless-application-model/blob/master/versions/2016-10-31.md#api
          Properties:
            Path: /hello
            Method: get

Outputs:
  # ServerlessRestApi is an implicit API created out of Events key under Serverless::Function
  # Find out more about other implicit resources you can reference within SAM
  # https://github.com/awslabs/serverless-application-model/blob/master/docs/internals/generated_resources.rst#api
  HelloWorldApi:
    Description: "API Gateway endpoint URL for Prod stage for Hello World function"
    Value: !Sub "https://${ServerlessRestApi}.execute-api.${AWS::Region}.amazonaws.com/Prod/hello/"
  HelloWorldFunction:
    Description: "Hello World Lambda Function ARN"
    Value: !GetAtt HelloWorldFunction.Arn
  HelloWorldFunctionIamRole:
    Description: "Implicit IAM Role created for Hello World function"
    Value: !GetAtt HelloWorldFunctionRole.Arn
```

### hello-world/app.mjs

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# cat hello-world/app.mjs
/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

export const lambdaHandler = async (event, context) => {
    try {
        return {
            'statusCode': 200,
            'body': JSON.stringify({
                message: 'hello world',
            })
        }
    } catch (err) {
        console.log(err);
        return err;
    }
};
```

### hello-world/package.json

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# cat hello-world/package.json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "hello world sample for NodeJS",
  "main": "app.js",
  "repository": "https://github.com/awslabs/aws-sam-cli/tree/develop/samcli/local/init/templates/cookiecutter-aws-sam-hello-nodejs",
  "author": "SAM CLI",
  "license": "MIT",
  "type": "module",
  "dependencies": {},
  "scripts": {
    "test": "node --experimental-vm-modules ./node_modules/.bin/jest"
  },
  "devDependencies": {
    "jest": "^29.2.1"
  }
}
```

## 4. アプリケーションビルド

### sam build 実行

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# sam build
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
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# tree .aws-sam/build
.aws-sam/build
├── HelloWorldFunction
│   ├── app.mjs
│   ├── node_modules
│   └── package.json
└── template.yaml

2 directories, 3 files
```

## 5. デプロイ実行

### sam deploy --guided 実行

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# sam deploy --guided

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
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# cat samconfig.toml
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

## 6. デプロイ結果確認

### CloudFormation スタック確認

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws cloudformation describe-stacks --stack-name sam-app-desu --query 'Stacks[0].Outputs'
[
    {
        "OutputKey": "HelloWorldApi",
        "OutputValue": "https://97kpcfv5ou.execute-api.us-east-1.amazonaws.com/Prod/hello/",
        "Description": "API Gateway endpoint URL for Prod stage for Hello World function"
    },
    {
        "OutputKey": "HelloWorldFunction",
        "OutputValue": "arn:aws:lambda:us-east-1:000000000000:function:sam-app-desu-HelloWorldFunction-83dbe99b",
        "Description": "Hello World Lambda Function ARN"
    },
    {
        "OutputKey": "HelloWorldFunctionIamRole",
        "OutputValue": "arn:aws:iam::000000000000:role/sam-app-desu-HelloWorldFunctionRole-8c7c35c4",
        "Description": "Implicit IAM Role created for Hello World function"
    }
]
```

### 作成されたリソース一覧

#### Lambda 関数

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws lambda list-functions --query 'Functions[?contains(FunctionName, `sam-app-desu`)].{Name:FunctionName,Runtime:Runtime,Handler:Handler}'
[
    {
        "Name": "sam-app-desu-HelloWorldFunction-83dbe99b",
        "Runtime": "nodejs20.x",
        "Handler": "app.lambdaHandler"
    }
]
```

#### API Gateway

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws apigateway get-rest-apis --query 'items[?contains(name, `sam-app-desu`)].{Name:name,Id:id,CreatedDate:createdDate}'
[
    {
        "Name": "sam-app-desu",
        "Id": "97kpcfv5ou",
        "CreatedDate": "2024-11-29T14:49:50+00:00"
    }
]
```

#### IAM ロール

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws iam list-roles --query 'Roles[?contains(RoleName, `sam-app-desu`)].{Name:RoleName,CreateDate:CreateDate}'
[
    {
        "Name": "sam-app-desu-HelloWorldFunctionRole-8c7c35c4",
        "CreateDate": "2024-11-29T14:49:49+00:00"
    }
]
```

## 7. API 動作テスト

### LocalStack 経由での API テスト

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# curl -X GET "http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello"
{"message":"hello world"}
```

### レスポンス詳細確認

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# curl -X GET "http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello" -i
HTTP/1.1 200
Content-Type: application/json
Content-Length: 25
Date: Fri, 29 Nov 2024 14:52:30 GMT
Server: hypercorn-h11

{"message":"hello world"}
```

## 8. 追加検証

### Lambda 関数詳細情報

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws lambda get-function --function-name sam-app-desu-HelloWorldFunction-83dbe99b --query 'Configuration.{FunctionName:FunctionName,Runtime:Runtime,Handler:Handler,CodeSize:CodeSize,Timeout:Timeout,MemorySize:MemorySize}'
{
    "FunctionName": "sam-app-desu-HelloWorldFunction-83dbe99b",
    "Runtime": "nodejs20.x",
    "Handler": "app.lambdaHandler",
    "CodeSize": 668,
    "Timeout": 3,
    "MemorySize": 128
}
```

### API Gateway リソース構造

```bash
root@b8a469f80fc6:/workspace/project-03-sam-lambda-api# aws apigateway get-resources --rest-api-id 97kpcfv5ou
{
    "items": [
        {
            "id": "n3qpckv9re",
            "pathPart": "hello",
            "resourceMethods": {
                "GET": {}
            },
            "parentId": "44vf78s1qe"
        },
        {
            "id": "44vf78s1qe",
            "path": "/"
        }
    ]
}
```

## 9. まとめ

### 成功した作業

- ✅ SAM プロジェクト初期化完了
- ✅ Node.js 20.x Lambda 関数作成
- ✅ API Gateway 統合設定
- ✅ CloudFormation スタックデプロイ
- ✅ API 動作確認完了

### 作成された AWS リソース（6 個）

1. **AWS::Lambda::Function**: `sam-app-desu-HelloWorldFunction-83dbe99b`
2. **AWS::IAM::Role**: `sam-app-desu-HelloWorldFunctionRole-8c7c35c4`
3. **AWS::ApiGateway::RestApi**: `97kpcfv5ou`
4. **AWS::ApiGateway::Deployment**: `ServerlessRestApiDeployment47fc2d5f9d`
5. **AWS::ApiGateway::Stage**: `ServerlessRestApiProdStage`
6. **AWS::Lambda::Permission**: `HelloWorldFunctionHelloWorldPermissionProd`

### API エンドポイント

- **URL**: `http://localstack:4566/restapis/97kpcfv5ou/Prod/_user_request_/hello`
- **Method**: GET
- **Response**: `{"message":"hello world"}`

### 実行時間

- **プロジェクト初期化**: 約 1 分
- **ビルド**: 約 10 秒
- **デプロイ**: 約 1 分
- **合計**: 約 2 分 10 秒

### Terraform(project-02)との比較

| 項目           | SAM                    | Terraform         |
| -------------- | ---------------------- | ----------------- |
| 設定ファイル数 | 1 個 (template.yaml)   | 1 個 (main.tf)    |
| 設定行数       | 30 行                  | 80 行             |
| リソース定義   | 1 個 (暗黙的 6 個作成) | 9 個 (明示的定義) |
| デプロイ時間   | 1 分                   | 1 分 30 秒        |
| 学習コスト     | 低                     | 中                |
