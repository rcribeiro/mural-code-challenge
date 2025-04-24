provider "aws" {
  region  = "us-east-1"
  profile = "lightlegal"
}

provider "mongodbatlas" {
  public_key  = var.mongodb_public_key
  private_key = var.mongodb_private_key
}
