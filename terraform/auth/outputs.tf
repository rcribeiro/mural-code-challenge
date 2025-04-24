output "user_pool_id" {
  value = aws_cognito_user_pool.legal_users.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.frontend_client.id
}
