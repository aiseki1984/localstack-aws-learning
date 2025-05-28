# LocalStack用のprovider設定
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true

  endpoints {
    lambda     = "http://localstack:4566"
    apigateway = "http://localstack:4566"
    iam        = "http://localstack:4566"
    sts        = "http://localstack:4566"
  }
}

# Lambda実行用のIAMロール
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda基本実行ポリシーのアタッチ
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambdaファンクション用のZIPファイル
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/index.js"
  output_path = "${path.module}/function.zip"
}

# Lambda関数
resource "aws_lambda_function" "calc_function" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "terraform-calc-function"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
  ]
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "calc_api" {
  name        = "terraform-calc-api"
  description = "Calculator API created with Terraform"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gatewayリソース (/calc)
resource "aws_api_gateway_resource" "calc_resource" {
  rest_api_id = aws_api_gateway_rest_api.calc_api.id
  parent_id   = aws_api_gateway_rest_api.calc_api.root_resource_id
  path_part   = "calc"
}

# API Gateway POSTメソッド
resource "aws_api_gateway_method" "calc_post" {
  rest_api_id   = aws_api_gateway_rest_api.calc_api.id
  resource_id   = aws_api_gateway_resource.calc_resource.id
  http_method   = "POST"
  authorization = "NONE"
}

# Lambda統合
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id             = aws_api_gateway_rest_api.calc_api.id
  resource_id             = aws_api_gateway_resource.calc_resource.id
  http_method             = aws_api_gateway_method.calc_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.calc_function.invoke_arn
}

# Lambda権限 (API Gatewayからの実行許可)
resource "aws_lambda_permission" "api_gateway_lambda" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.calc_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.calc_api.execution_arn}/*/*"
}

# API Gatewayデプロイメント
resource "aws_api_gateway_deployment" "calc_deployment" {
  depends_on = [
    aws_api_gateway_method.calc_post,
    aws_api_gateway_integration.lambda_integration,
  ]

  rest_api_id = aws_api_gateway_rest_api.calc_api.id

  lifecycle {
    create_before_destroy = true
  }
}

# API Gatewayステージ
resource "aws_api_gateway_stage" "calc_stage" {
  deployment_id = aws_api_gateway_deployment.calc_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.calc_api.id
  stage_name    = "prod"
}

# 出力値
output "api_gateway_url" {
  description = "API Gateway endpoint URL"
  value       = "http://localstack:4566/restapis/${aws_api_gateway_rest_api.calc_api.id}/${aws_api_gateway_stage.calc_stage.stage_name}/_user_request_/calc"
}

output "lambda_function_name" {
  description = "Lambda function name"
  value       = aws_lambda_function.calc_function.function_name
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_api_gateway_rest_api.calc_api.id
}

output "stage_name" {
  description = "API Gateway stage name"
  value       = aws_api_gateway_stage.calc_stage.stage_name
}
