terraform {
  required_providers {
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.9"
    }
  }
}

# Use data sources to reference existing resources instead of creating them
data "mongodbatlas_project" "main" {
  name = "${var.project_name}-project"  # Make sure this matches your manually created project name
}

data "mongodbatlas_cluster" "main" {
  project_id = data.mongodbatlas_project.main.id
  name       = "${var.project_name}-cluster"  # Make sure this matches your manually created cluster name
}
