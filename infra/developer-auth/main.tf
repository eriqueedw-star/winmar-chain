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

resource "aws_cognito_user_pool" "developers" {
  name                     = "winmar-developers-${var.environment}"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 1
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }

  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject        = "Verify your Winmar developer account"
    email_message        = "Your Winmar developer verification code is {####}. If you did not request this, you can ignore this email."
  }

  deletion_protection = var.environment == "production" ? "ACTIVE" : "INACTIVE"

  tags = {
    Project     = "WinmarChain"
    Environment = var.environment
    Purpose     = "Developer email authentication"
  }
}

resource "aws_cognito_user_pool_client" "developers" {
  name                                 = "winmar-developer-tools"
  user_pool_id                         = aws_cognito_user_pool.developers.id
  generate_secret                      = false
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = ["${var.developer_origin}/developers.html"]
  logout_urls                          = ["${var.developer_origin}/developers.html"]

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  access_token_validity  = 1
  id_token_validity      = 1
  refresh_token_validity = 7
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  read_attributes  = ["email", "email_verified", "name"]
  write_attributes = ["email", "name"]
}

resource "aws_cognito_user_pool_domain" "developers" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.developers.id
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
    audience = [aws_cognito_user_pool_client.developers.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.developers.id}"
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
