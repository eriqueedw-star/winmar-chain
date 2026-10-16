variable "aws_region" {
  description = "AWS region for the developer identity and wallet-link service."
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Isolated deployment name. Production enables Cognito deletion protection."
  type        = string
  default     = "staging"

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

variable "cognito_domain_prefix" {
  description = "Globally unique Cognito managed-login prefix, e.g. winmar-developers-eun1-<suffix>."
  type        = string

  validation {
    condition     = length(var.cognito_domain_prefix) >= 1 && length(var.cognito_domain_prefix) <= 63 && can(regex("^[a-z0-9-]+$", var.cognito_domain_prefix))
    error_message = "Cognito domain prefix must be 1-63 lowercase letters, numbers, or hyphens."
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
