# General
variable "project_name" {
  description = "Name of the LightLegal project"
  type        = string
  default     = "lightlegal"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_profile" {
  description = "AWS CLI profile name"
  type        = string
  default     = "personal"
}

# MongoDB Atlas
variable "mongodb_org_id" {
  description = "MongoDB Atlas Organization ID"
  type        = string
}

variable "mongodb_public_key" {
  description = "MongoDB Atlas public API key"
  type        = string
}

variable "mongodb_private_key" {
  description = "MongoDB Atlas private API key"
  type        = string
}
