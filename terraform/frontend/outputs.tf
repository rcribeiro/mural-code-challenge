output "website_endpoint" {
  value       = aws_s3_bucket_website_configuration.frontend.website_endpoint
  description = "S3 website endpoint"
}

output "cloudfront_domain" {
  value = aws_cloudfront_distribution.frontend.domain_name
  description = "The CloudFront distribution domain name"
}
