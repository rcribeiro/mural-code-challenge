resource "aws_cognito_user_pool" "legal_users" {
  name = "${var.project_name}-user-pool"
}

resource "aws_cognito_user_pool_client" "frontend_client" {
  name         = "${var.project_name}-client"
  user_pool_id = aws_cognito_user_pool.legal_users.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
  ]

  generate_secret = false
}
