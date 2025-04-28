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

output "frontend_bucket_name" {
  description = "The name of the S3 bucket hosting the frontend"
  value       = module.frontend.bucket_name
}

output "frontend_bucket_website_endpoint" {
  description = "The website endpoint URL of the S3 bucket"
  value       = module.frontend.bucket_website_endpoint
}

output "cloudfront_distribution_domain_name" {
  description = "The domain name of the CloudFront distribution"
  value       = module.frontend.cloudfront_domain
}
