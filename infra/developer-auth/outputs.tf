output "user_pool_id" {
  value       = aws_cognito_user_pool.developers.id
  description = "Public Cognito User Pool ID for the static developer-tools client."
}

output "user_pool_client_id" {
  value       = aws_cognito_user_pool_client.developers.id
  description = "Public Cognito SPA app client ID. It has no client secret."
}

output "hosted_ui_domain" {
  value       = "https://${aws_cognito_user_pool_domain.developers.domain}.auth.${var.aws_region}.amazoncognito.com"
  description = "Cognito managed-login origin."
}

output "aws_region" {
  value       = var.aws_region
  description = "AWS region to set in config/developer-tools.json developerAuth.region."
}

output "redirect_uri" {
  value       = "${var.developer_origin}/developers.html"
  description = "Exact Cognito callback and logout URI for the static developer-tools page."
}

output "wallet_api_url" {
  value       = aws_apigatewayv2_api.wallet_api.api_endpoint
  description = "JWT-authorized API for one-time wallet challenges and linked wallet profiles."
}

output "deployment_notice" {
  value       = "No resources are created until an AWS operator reviews and applies this Terraform configuration."
  description = "Explicit deployment boundary."
}
