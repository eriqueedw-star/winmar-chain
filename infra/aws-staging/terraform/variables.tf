variable "aws_region" {
  description = "Operator-approved AWS region; Singapore suggested."
  type        = string
  default     = "ap-southeast-1"
}

variable "vpc_id" {
  description = "Existing approved VPC. This stack NEVER creates an internet gateway or network."
  type        = string
}

variable "private_subnet_id" {
  description = "Existing approved subnet WITHOUT any direct public IP assignment; SSM access via controlled NAT or VPC endpoints."
  type        = string
}

variable "instance_type" {
  description = "Small initial staging capacity. Change only after review."
  type        = string
  default     = "t3.medium"
}

variable "root_volume_gb" {
  type    = number
  default = 40

  validation {
    condition     = var.root_volume_gb >= 30 && var.root_volume_gb <= 200
    error_message = "Staging EBS root volume must be 30-200 GiB."
  }
}

variable "environment_name" {
  type    = string
  default = "wmc-faucet-staging"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,35}$", var.environment_name))
    error_message = "Use a short lowercase staging environment name."
  }
}
