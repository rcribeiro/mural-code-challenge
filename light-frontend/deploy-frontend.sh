#!/bin/bash
set -e

# Build the React app
echo "Building React app..."
# cd light-frontend
npm install
npm run build

# Get the S3 bucket name from Terraform output
cd ../terraform
S3_BUCKET=$(terraform output -raw frontend_bucket_name)

# Extract other values from Terraform outputs
API_URL=$(terraform output -raw api_gateway_url)
USER_POOL_ID=$(terraform output -raw user_pool_id)
USER_POOL_CLIENT_ID=$(terraform output -raw user_pool_client_id)

# Create a config file with environment variables
echo "Creating config.js with environment variables..."
cat > ../light-frontend/build/config.js << EOF
window.REACT_APP_API_URL = "${API_URL}";
window.REACT_APP_USER_POOL_ID = "${USER_POOL_ID}";
window.REACT_APP_USER_POOL_CLIENT_ID = "${USER_POOL_CLIENT_ID}";
window.REACT_APP_REGION = "us-east-1";
EOF

# Upload to S3
echo "Deploying to S3 bucket: $S3_BUCKET"
aws s3 sync ../light-frontend/build/ s3://$S3_BUCKET/ --delete

export AWS_PROFILE=personal

# Invalidate CloudFront cache
CLOUDFRONT_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null] | [?contains(Aliases.Items, '$S3_BUCKET')] | [0].Id" --output text)

if [ ! -z "$CLOUDFRONT_ID" ]; then
  echo "Invalidating CloudFront cache for distribution: $CLOUDFRONT_ID"
  aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
fi

echo "Deployment complete!"
