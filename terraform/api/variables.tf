variable "project_name" {
  type = string
}

variable "user_pool_id" {
  type = string
}

variable "client_id" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "mongodb_uri" {
  description = "MongoDB connection string"
  type        = string
  default     = ""  # Default to empty string
}

variable "cloudfront_domain" {
  description = "The CloudFront distribution domain name for the frontend"
  type        = string
  default     = ""  # Default to empty string in case it's not provided
}
