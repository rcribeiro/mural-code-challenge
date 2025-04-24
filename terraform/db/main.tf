resource "mongodbatlas_project" "main" {
  name   = "${var.project_name}-project"
  org_id = var.mongodb_org_id
}

resource "mongodbatlas_cluster" "main" {
  project_id         = mongodbatlas_project.main.id
  name               = "${var.project_name}-cluster"
  provider_name      = "AWS"
  region_name        = "US_EAST_1"
  cluster_type       = "M0" # Free tier
  num_shards         = 1
  replication_factor = 3
}

output "connection_string" {
  value     = mongodbatlas_cluster.main.connection_strings.standard_srv
  sensitive = true
}
