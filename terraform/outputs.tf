output "user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.auth.user_pool_id
}

output "user_pool_client_id" {
  description = "Cognito User Pool Client ID"
  value       = module.auth.user_pool_client_id
}

output "lambda_url" {
  description = "API Gateway endpoint URL"
  value       = module.api.api_gateway_url
}

output "mongodb_cluster_connection_string" {
  description = "MongoDB Atlas connection string"
  value       = module.db.connection_string
  sensitive   = true
}
