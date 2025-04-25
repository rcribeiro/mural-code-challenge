output "connection_string" {
  value     = try(
    data.mongodbatlas_cluster.main.connection_strings[0].standard_srv,
    data.mongodbatlas_cluster.main.connection_strings.0.standard_srv,
    null
  )
  sensitive = true
}
