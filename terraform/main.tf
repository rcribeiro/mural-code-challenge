terraform {
  required_version = ">= 1.3.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.9"
    }
  }

  backend "s3" {
    bucket         = "lightlegal-terraform-state"
    key            = "lightlegal/terraform.tfstate"
    region         = "us-east-1"
    profile        = "sally"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
}

provider "mongodbatlas" {
  public_key  = var.mongodb_public_key
  private_key = var.mongodb_private_key
}

module "auth" {
  source = "./auth"

  project_name = var.project_name
}

module "api" {
  source       = "./api"
  project_name = var.project_name
  user_pool_id = module.auth.user_pool_id
  client_id    = module.auth.user_pool_client_id
  aws_region   = var.aws_region
}

module "db" {
  source              = "./db"
  project_name        = var.project_name
  mongodb_org_id      = var.mongodb_org_id
  mongodb_public_key  = var.mongodb_public_key
  mongodb_private_key = var.mongodb_private_key
}
