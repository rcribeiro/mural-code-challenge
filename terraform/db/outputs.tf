output "connection_string" {
  value     = mongodbatlas_cluster.lightlegal_cluster.connection_strings[0]
  sensitive = true
}
