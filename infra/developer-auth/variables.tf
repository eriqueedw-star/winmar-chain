variable "aws_region" {
  description = "AWS region for the developer identity and wallet-link service."
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Isolated backend deployment name. Cognito is already provisioned and is not managed here."
  type        = string
  default     = "production"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "developer_origin" {
  description = "Exact HTTPS origin serving developers.html, with no trailing slash."
  type        = string

  validation {
    condition     = can(regex("^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?$", var.developer_origin))
    error_message = "Use one exact HTTPS origin, such as https://winmarchain.io."
  }
}

variable "cognito_user_pool_id" {
  description = "ID of the existing Winmar Developer Accounts Cognito user pool. Terraform must not create a second pool."
  type        = string

  validation {
    condition     = can(regex("^eu-north-1_[A-Za-z0-9]+$", var.cognito_user_pool_id))
    error_message = "Use the existing eu-north-1 Cognito user pool ID."
  }
}

variable "cognito_client_id" {
  description = "ID of the existing public Winmar Developer Tools SPA app client."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{20,}$", var.cognito_client_id))
    error_message = "Use the existing Cognito app client ID."
  }
}

variable "cognito_hosted_ui_domain" {
  description = "HTTPS origin of the existing Cognito managed-login domain, without a trailing slash."
  type        = string

  validation {
    condition     = can(regex("^https://[a-z0-9-]+[.]auth[.]eu-north-1[.]amazoncognito[.]com$", var.cognito_hosted_ui_domain))
    error_message = "Use the existing eu-north-1 Cognito managed-login origin."
  }
}

variable "lambda_package_path" {
  description = "Bundled Lambda ZIP created by scripts/build-developer-auth-lambda.sh."
  type        = string
  default     = "build/function.zip"
}

variable "lambda_name" {
  description = "Short Lambda function name prefix."
  type        = string
  default     = "winmar-developer-wallet-api"
}
