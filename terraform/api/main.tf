resource "aws_iam_role" "lambda_exec_role" {
  name = "${var.project_name}-lambda-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

# Add more detailed CloudWatch Logs permissions
resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.project_name}-lambda-logging-policy"
  description = "IAM policy for logging from a lambda"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ],
        Effect   = "Allow",
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

# Create a CloudWatch Log Group with longer retention
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 14
}

# Check if the zip file exists
locals {
  lambda_zip_exists = fileexists("${path.module}/../../lightlegal-api/lambda.zip")
  source_code_hash = local.lambda_zip_exists ? filebase64sha256("${path.module}/../../lightlegal-api/lambda.zip") : ""
}

resource "aws_lambda_function" "loopback_api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  
  # Use a placeholder zip file if the actual one doesn't exist
  filename         = local.lambda_zip_exists ? "${path.module}/../../lightlegal-api/lambda.zip" : "${path.module}/placeholder.zip"
  source_code_hash = local.source_code_hash
  
  # Increase memory and timeout for better performance
  memory_size      = 256
  timeout          = 30
  
  # Explicitly set the log group
  depends_on = [aws_cloudwatch_log_group.lambda_log_group]
  
  environment {
    variables = {
      USER_POOL_ID = var.user_pool_id
      CLIENT_ID    = var.client_id
      REGION       = var.aws_region
      MONGODB_URI  = var.mongodb_uri
      DEBUG        = "*"
      NODE_ENV     = "production"
    }
  }
}

# Add explicit permission for API Gateway to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.loopback_api.function_name
  principal     = "apigateway.amazonaws.com"
  
  # The source ARN for the API Gateway
  source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
  
  # Enable detailed CloudWatch logging
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["*"]
  }
}

# Add logging for API Gateway
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
  
  # Enable detailed access logging
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      path           = "$context.path"
      errorMessage   = "$context.error.message"
      errorType      = "$context.error.responseType"
      integrationError = "$context.integration.error"
      integrationStatus = "$context.integration.status"
      integrationLatency = "$context.integration.latency"
    })
  }
}

# Create a CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.project_name}-http-api"
  retention_in_days = 14
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.loopback_api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

