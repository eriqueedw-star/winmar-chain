terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "wallet_links" {
  name         = "winmar-developer-wallets-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }
  attribute {
    name = "sk"
    type = "S"
  }
  attribute {
    name = "accountPk"
    type = "S"
  }
  attribute {
    name = "accountSk"
    type = "S"
  }

  global_secondary_index {
    name               = "account-index"
    hash_key           = "accountPk"
    range_key          = "accountSk"
    projection_type    = "INCLUDE"
    non_key_attributes = ["walletAddress", "chainId", "linkedAt"]
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }
  point_in_time_recovery {
    enabled = true
  }

  tags = {
    Project     = "WinmarChain"
    Environment = var.environment
    Purpose     = "Verified developer wallet links and short-lived challenges"
  }
}

resource "aws_iam_role" "wallet_api" {
  name = "winmar-developer-wallet-api-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "wallet_api" {
  name = "wallet-links-minimum-access"
  role = aws_iam_role.wallet_api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query",
        "dynamodb:TransactWriteItems",
      ]
      Resource = [
        aws_dynamodb_table.wallet_links.arn,
        "${aws_dynamodb_table.wallet_links.arn}/index/account-index",
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "wallet_api_logs" {
  role       = aws_iam_role.wallet_api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "wallet_api" {
  name              = "/aws/lambda/${var.lambda_name}-${var.environment}"
  retention_in_days = 90
}

resource "aws_lambda_function" "wallet_api" {
  function_name    = "${var.lambda_name}-${var.environment}"
  role             = aws_iam_role.wallet_api.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  filename         = var.lambda_package_path
  source_code_hash = filebase64sha256(var.lambda_package_path)
  timeout          = 10
  memory_size      = 256

  environment {
    variables = {
      WALLET_LINKS_TABLE = aws_dynamodb_table.wallet_links.name
      ALLOWED_ORIGINS    = var.developer_origin
      WINMAR_RPC_URL     = "https://rpc.winmarchain.io"
    }
  }

  depends_on = [aws_cloudwatch_log_group.wallet_api]
  tags = {
    Project     = "WinmarChain"
    Environment = var.environment
  }
}

resource "aws_apigatewayv2_api" "wallet_api" {
  name          = "winmar-developer-auth-${var.environment}"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = [var.developer_origin]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["authorization", "content-type"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.wallet_api.id
  authorizer_type  = "JWT"
  name             = "winmar-developer-cognito"
  identity_sources = ["$request.header.Authorization"]
  jwt_configuration {
    audience = [var.cognito_client_id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

resource "aws_apigatewayv2_integration" "wallet_api" {
  api_id                 = aws_apigatewayv2_api.wallet_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.wallet_api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

resource "aws_apigatewayv2_route" "wallets_get" {
  api_id             = aws_apigatewayv2_api.wallet_api.id
  route_key          = "GET /v1/wallets"
  target             = "integrations/${aws_apigatewayv2_integration.wallet_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "wallet_challenge" {
  api_id             = aws_apigatewayv2_api.wallet_api.id
  route_key          = "POST /v1/wallet/challenge"
  target             = "integrations/${aws_apigatewayv2_integration.wallet_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "wallet_link" {
  api_id             = aws_apigatewayv2_api.wallet_api.id
  route_key          = "POST /v1/wallet/link"
  target             = "integrations/${aws_apigatewayv2_integration.wallet_api.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.wallet_api.id
  name        = "$default"
  auto_deploy = true
  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 20
    throttling_rate_limit    = 10
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowWinmarDeveloperAuthApi"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.wallet_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.wallet_api.execution_arn}/*/*"
}
