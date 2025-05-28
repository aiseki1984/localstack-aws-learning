# 実際の実行ログ

project-02 で実際に実行したコマンドとその出力結果

## Terraform 初期化

```bash
$ terraform init

Initializing the backend...
Initializing provider plugins...
- Finding hashicorp/archive versions matching "~> 2.0"...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/archive v2.7.1...
- Installed hashicorp/archive v2.7.1 (signed by HashiCorp)
- Installing hashicorp/aws v5.98.0...
- Installed hashicorp/aws v5.98.0 (signed by HashiCorp)

Terraform has been successfully initialized!
```

## Terraform プラン確認

```bash
$ terraform plan

data.archive_file.lambda_zip: Reading...
data.archive_file.lambda_zip: Read complete after 0s [id=a4ef3b8cb59c7037ad9265e22d148d18973e0395]

Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # aws_api_gateway_deployment.calc_deployment will be created
  + resource "aws_api_gateway_deployment" "calc_deployment" {
      + created_date  = (known after apply)
      + execution_arn = (known after apply)
      + id            = (known after apply)
      + invoke_url    = (known after apply)
      + rest_api_id   = (known after apply)
      + stage_name    = "prod"
    }

  # aws_api_gateway_integration.lambda_integration will be created
  + resource "aws_api_gateway_integration" "lambda_integration" {
      + cache_namespace         = (known after apply)
      + connection_type         = "INTERNET"
      + http_method             = "POST"
      + id                      = (known after apply)
      + integration_http_method = "POST"
      + passthrough_behavior    = (known after apply)
      + resource_id             = (known after apply)
      + rest_api_id             = (known after apply)
      + timeout_milliseconds    = 29000
      + type                    = "AWS_PROXY"
      + uri                     = (known after apply)
    }

  # aws_api_gateway_method.calc_post will be created
  + resource "aws_api_gateway_method" "calc_post" {
      + api_key_required = false
      + authorization    = "NONE"
      + http_method      = "POST"
      + id               = (known after apply)
      + resource_id      = (known after apply)
      + rest_api_id      = (known after apply)
    }

  # aws_api_gateway_resource.calc_resource will be created
  + resource "aws_api_gateway_resource" "calc_resource" {
      + id          = (known after apply)
      + parent_id   = (known after apply)
      + path        = (known after apply)
      + path_part   = "calc"
      + rest_api_id = (known after apply)
    }

  # aws_api_gateway_rest_api.calc_api will be created
  + resource "aws_api_gateway_rest_api" "calc_api" {
      + api_key_source               = (known after apply)
      + arn                          = (known after apply)
      + binary_media_types           = (known after apply)
      + created_date                 = (known after apply)
      + description                  = "Calculator API created with Terraform"
      + disable_execute_api_endpoint = (known after apply)
      + execution_arn                = (known after apply)
      + id                           = (known after apply)
      + minimum_compression_size     = (known after apply)
      + name                         = "terraform-calc-api"
      + policy                       = (known after apply)
      + root_resource_id             = (known after apply)
      + tags_all                     = (known after apply)

      + endpoint_configuration {
          + ip_address_type  = (known after apply)
          + types            = [
              + "REGIONAL",
            ]
          + vpc_endpoint_ids = (known after apply)
        }
    }

  # aws_iam_role.lambda_role will be created
  + resource "aws_iam_role" "lambda_role" {
      + arn                   = (known after apply)
      + assume_role_policy    = jsonencode(
            {
              + Statement = [
                  + {
                      + Action    = "sts:AssumeRole"
                      + Effect    = "Allow"
                      + Principal = {
                          + Service = "lambda.amazonaws.com"
                        }
                    },
                ]
              + Version   = "2012-10-17"
            }
        )
      + create_date           = (known after apply)
      + force_detach_policies = false
      + id                    = (known after apply)
      + managed_policy_arns   = (known after apply)
      + max_session_duration  = 3600
      + name                  = "lambda-execution-role"
      + name_prefix           = (known after apply)
      + path                  = "/"
      + tags_all              = (known after apply)
      + unique_id             = (known after apply)

      + inline_policy (known after apply)
    }

  # aws_iam_role_policy_attachment.lambda_basic will be created
  + resource "aws_iam_role_policy_attachment" "lambda_basic" {
      + id         = (known after apply)
      + policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
      + role       = "lambda-execution-role"
    }

  # aws_lambda_function.calc_function will be created
  + resource "aws_lambda_function" "calc_function" {
      + architectures                  = (known after apply)
      + arn                            = (known after apply)
      + code_sha256                    = (known after apply)
      + filename                       = "./function.zip"
      + function_name                  = "terraform-calc-function"
      + handler                        = "index.handler"
      + id                             = (known after apply)
      + invoke_arn                     = (known after apply)
      + last_modified                  = (known after apply)
      + memory_size                    = 128
      + package_type                   = "Zip"
      + publish                        = false
      + qualified_arn                  = (known after apply)
      + qualified_invoke_arn           = (known after apply)
      + reserved_concurrent_executions = -1
      + role                           = (known after apply)
      + runtime                        = "nodejs18.x"
      + signing_job_arn                = (known after apply)
      + signing_profile_version_arn    = (known after apply)
      + skip_destroy                   = false
      + source_code_hash               = "qbqsjCmOkgzd5mo7UqWk+g2nIkoUDRVsfS1LUhdJ0gw="
      + source_code_size               = (known after apply)
      + tags_all                       = (known after apply)
      + timeout                        = 3
      + version                        = (known after apply)

      + ephemeral_storage (known after apply)
      + logging_config (known after apply)
      + tracing_config (known after apply)
    }

  # aws_lambda_permission.api_gateway_lambda will be created
  + resource "aws_lambda_permission" "api_gateway_lambda" {
      + action              = "lambda:InvokeFunction"
      + function_name       = "terraform-calc-function"
      + id                  = (known after apply)
      + principal           = "apigateway.amazonaws.com"
      + source_arn          = (known after apply)
      + statement_id        = "AllowExecutionFromAPIGateway"
      + statement_id_prefix = (known after apply)
    }

Plan: 9 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + api_gateway_id       = (known after apply)
  + api_gateway_url      = (known after apply)
  + lambda_function_name = "terraform-calc-function"
```

## Terraform 適用

```bash
$ terraform apply -auto-approve

data.archive_file.lambda_zip: Reading...
data.archive_file.lambda_zip: Read complete after 0s [id=a4ef3b8cb59c7037ad9265e22d148d18973e0395]

Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:
  [省略 - 上記と同じプラン]

aws_api_gateway_rest_api.calc_api: Creating...
aws_iam_role.lambda_role: Creating...
aws_api_gateway_rest_api.calc_api: Creation complete after 0s [id=imnkws6bjd]
aws_iam_role.lambda_role: Creation complete after 0s [id=lambda-execution-role]
aws_api_gateway_resource.calc_resource: Creating...
aws_iam_role_policy_attachment.lambda_basic: Creating...
aws_iam_role_policy_attachment.lambda_basic: Creation complete after 0s [id=lambda-execution-role-20250528152329069000000001]
aws_api_gateway_resource.calc_resource: Creation complete after 0s [id=rksu5kapew]
aws_api_gateway_method.calc_post: Creating...
aws_lambda_function.calc_function: Creating...
aws_api_gateway_method.calc_post: Creation complete after 0s [id=agm-imnkws6bjd-rksu5kapew-POST]
aws_lambda_function.calc_function: Creation complete after 5s [id=terraform-calc-function]
aws_lambda_permission.api_gateway_lambda: Creating...
aws_api_gateway_integration.lambda_integration: Creating...
aws_lambda_permission.api_gateway_lambda: Creation complete after 0s [id=AllowExecutionFromAPIGateway]
aws_api_gateway_integration.lambda_integration: Creation complete after 0s [id=agi-imnkws6bjd-rksu5kapew-POST]
aws_api_gateway_deployment.calc_deployment: Creating...
aws_api_gateway_deployment.calc_deployment: Creation complete after 0s [id=5sdiau2sj3]

Apply complete! Resources: 9 added, 0 changed, 0 destroyed.

Outputs:

api_gateway_id = "imnkws6bjd"
api_gateway_url = "http://localstack:4566/restapis/imnkws6bjd/prod/_user_request_/calc"
lambda_function_name = "terraform-calc-function"
```

## API テスト

```bash
$ API_ID=$(terraform output -raw api_gateway_id)
$ curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"num1": "10", "num2": "10"}' \
  "http://localstack:4566/restapis/$API_ID/prod/_user_request_/calc"

The product of 10 and 10 is 100
```

## 作成されたリソース確認

### Lambda 関数一覧

```bash
$ aws lambda list-functions

{
    "Functions": [
        {
            "FunctionName": "terraform-calc-function",
            "FunctionArn": "arn:aws:lambda:us-east-1:000000000000:function:terraform-calc-function",
            "Runtime": "nodejs18.x",
            "Role": "arn:aws:iam::000000000000:role/lambda-execution-role",
            "Handler": "index.handler",
            "CodeSize": 304,
            "Description": "",
            "Timeout": 3,
            "MemorySize": 128,
            "LastModified": "2025-05-28T15:23:29.222658+0000",
            "CodeSha256": "qbqsjCmOkgzd5mo7UqWk+g2nIkoUDRVsfS1LUhdJ0gw=",
            "Version": "$LATEST",
            "TracingConfig": {
                "Mode": "PassThrough"
            },
            "RevisionId": "0c2002e4-b320-4c00-aa6a-24b5f7d848dc",
            "PackageType": "Zip",
            "Architectures": [
                "x86_64"
            ],
            "EphemeralStorage": {
                "Size": 512
            },
            "SnapStart": {
                "ApplyOn": "None",
                "OptimizationStatus": "Off"
            },
            "LoggingConfig": {
                "LogFormat": "Text",
                "LogGroup": "/aws/lambda/terraform-calc-function"
            }
        }
    ]
}
```

### API Gateway 一覧

```bash
$ aws apigateway get-rest-apis

{
    "items": [
        {
            "id": "imnkws6bjd",
            "name": "terraform-calc-api",
            "description": "Calculator API created with Terraform",
            "createdDate": "2025-05-29T00:23:29+09:00",
            "apiKeySource": "HEADER",
            "endpointConfiguration": {
                "types": [
                    "REGIONAL"
                ]
            },
            "disableExecuteApiEndpoint": false,
            "rootResourceId": "txcpdor0yy"
        }
    ]
}
```

## 実行時の注意事項

### Docker Compose の警告

実行中に以下の警告が表示されますが、動作には影響ありません：

```
WARN[0000] /Users/pakupaku/_workspace/cicd/localstack-learning-2/docker-compose.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion
```

### Terraform の警告

stage_name に関する警告が表示されますが、LocalStack では問題なく動作します：

```
Warning: Argument is deprecated
stage_name is deprecated. Use the aws_api_gateway_stage resource instead.
```

## 成功のポイント

1. **archive provider の追加**: 最初に archive provider が不足していたエラーを解決
2. **LocalStack endpoints の設定**: 全ての AWS サービスのエンドポイントを LocalStack に向ける
3. **リソース間の依存関係**: Terraform が自動的に適切な順序でリソースを作成
4. **LocalStack 特有の URL 形式**: API Gateway のエンドポイント URL が LocalStack 形式であることを確認
