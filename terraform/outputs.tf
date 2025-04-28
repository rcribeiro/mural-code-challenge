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

output "frontend_website_endpoint" {
  value = module.frontend.website_endpoint
}

output "frontend_cloudfront_domain" {
  value = module.frontend.cloudfront_domain
  description = "The CloudFront distribution domain name for the frontend"
}
