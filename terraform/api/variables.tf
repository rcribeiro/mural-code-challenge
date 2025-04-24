variable "project_name" {
  description = "Project name for naming"
  type        = string
}

variable "user_pool_id" {
  description = "Cognito User Pool ID"
  type        = string
}

variable "client_id" {
  description = "Cognito App Client ID"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}
