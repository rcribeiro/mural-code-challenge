terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Comment out the MongoDB Atlas provider
    # mongodbatlas = {
    #   source  = "mongodb/mongodbatlas"
    #   version = "~> 1.9"
    # }
  }

  backend "s3" {
    bucket         = "light-terraform-state"
    key            = "light/terraform.tfstate"
    region         = "us-east-1"
    profile        = "personal"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

# Comment out the MongoDB Atlas provider
# provider "mongodbatlas" {
#   public_key  = var.mongodb_public_key
#   private_key = var.mongodb_private_key
# }

module "auth" {
  source       = "./auth"
  project_name = var.project_name
}

module "api" {
  source       = "./api"
  project_name = var.project_name
  user_pool_id = module.auth.user_pool_id
  client_id    = module.auth.user_pool_client_id
  aws_region   = var.aws_region
  mongodb_uri  = local.mongodb_connection_string
}

# Comment out the MongoDB module
# module "db" {
#   source              = "./db"
#   project_name        = var.project_name
#   mongodb_org_id      = var.mongodb_org_id
#   mongodb_public_key  = var.mongodb_public_key
#   mongodb_private_key = var.mongodb_private_key
# }

# Add a local value for the MongoDB connection string
locals {
  # Remove the database name from the URL path
  mongodb_connection_string = "mongodb+srv://rcribeiro73:PxJiMm74GVvjxCJu@light-cluster.77srs6i.mongodb.net/?retryWrites=true&w=majority&appName=light-cluster"
}
