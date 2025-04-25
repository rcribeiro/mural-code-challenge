variable "project_name" {
  type    = string
  default = "lightlegal"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "personal"
}

variable "mongodb_org_id" {
  type        = string
  description = "MongoDB Atlas organization ID"
}

variable "mongodb_public_key" {
  type        = string
  description = "MongoDB Atlas public API key"
}

variable "mongodb_private_key" {
  type        = string
  description = "MongoDB Atlas private API key"
}
