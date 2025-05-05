#!/bin/bash
# scripts/create-admin.sh
set -e

echo "🔑 Creating admin user in Cognito User Pool..."

# Get the Terraform outputs
cd ../terraform
USER_POOL_ID=$(terraform output -raw user_pool_id)
CLIENT_ID=$(terraform output -raw user_pool_client_id)
cd ..

if [ -z "$USER_POOL_ID" ] || [ -z "$CLIENT_ID" ]; then
  echo "❌ Error: Could not get User Pool ID or Client ID from Terraform outputs"
  exit 1
fi

# Admin user details
ADMIN_USERNAME="admin@example.com"
ADMIN_PASSWORD="StrongPassword123!"

echo "👤 Creating user: $ADMIN_USERNAME"
aws cognito-idp sign-up \
  --client-id $CLIENT_ID \
  --username $ADMIN_USERNAME \
  --password $ADMIN_PASSWORD \
  --user-attributes Name=email,Value=$ADMIN_USERNAME

echo "✅ Confirming user (bypassing email verification)"
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $USER_POOL_ID \
  --username $ADMIN_USERNAME

echo "🎉 Admin user created successfully!"
echo "Username: $ADMIN_USERNAME"
echo "Password: $ADMIN_PASSWORD"
echo ""
echo "You can now log in to the application using these credentials."
