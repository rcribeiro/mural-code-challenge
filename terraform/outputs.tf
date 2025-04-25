output "user_pool_id" {
  value = module.auth.user_pool_id
}

output "user_pool_client_id" {
  value = module.auth.user_pool_client_id
}

output "api_gateway_url" {
  value = module.api.api_gateway_url
}

output "mongodb_cluster_connection_string" {
  value     = local.mongodb_connection_string
  sensitive = true
}
