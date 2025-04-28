resource "aws_cognito_user_pool" "legal_users" {
  name = "${var.project_name}-user-pool"
  
  # Auto-verification of email
  auto_verified_attributes = ["email"]
  
  # Email configuration
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
  
  # Verification message
  verification_message_template {
    default_email_option = "CONFIRM_WITH_CODE"
    email_subject = "Your verification code"
    email_message = "Your verification code is {####}"
  }
  
  # Password policy
  password_policy {
    minimum_length = 8
    require_lowercase = true
    require_numbers = true
    require_symbols = false
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "frontend_client" {
  name         = "${var.project_name}-client"
  user_pool_id = aws_cognito_user_pool.legal_users.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  generate_secret = false
}
