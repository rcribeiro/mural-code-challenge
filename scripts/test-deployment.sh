#!/bin/bash
# scripts/test-deployment.sh
set -e

echo "🧪 Testing deployment..."

# Get the Terraform outputs
cd terraform
API_URL=$(terraform output -raw api_gateway_url)
USER_POOL_ID=$(terraform output -raw user_pool_id)
CLIENT_ID=$(terraform output -raw user_pool_client_id)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_distribution_domain)
cd ..

if [ -z "$API_URL" ] || [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ] || [ -z "$CLOUDFRONT_DOMAIN" ]; then
  echo "❌
