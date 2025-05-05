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

# Create IAM role for API Gateway to write logs to CloudWatch
resource "aws_iam_role" "api_gateway_cloudwatch_role" {
  name = "${var.project_name}-api-gateway-cloudwatch-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

# Attach CloudWatch logs policy to the role
resource "aws_iam_role_policy" "api_gateway_cloudwatch_policy" {
  name = "${var.project_name}-api-gateway-cloudwatch-policy"
  role = aws_iam_role.api_gateway_cloudwatch_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
          "logs:GetLogEvents",
          "logs:FilterLogEvents"
        ],
        Effect = "Allow",
        Resource = "*"
      }
    ]
  })
}

# Set up API Gateway account settings to use the CloudWatch role
resource "aws_api_gateway_account" "api_gateway_account" {
  cloudwatch_role_arn = aws_iam_role.api_gateway_cloudwatch_role.arn
}

# Create a CloudWatch Log Group with longer retention
resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 14
}

# Check if the zip file exists
locals {
  lambda_zip_exists = fileexists("${path.module}/../../light-api/lambda.zip")
  source_code_hash = local.lambda_zip_exists ? filebase64sha256("${path.module}/../../light-api/lambda.zip") : ""
}

resource "aws_lambda_layer_version" "dependencies_layer" {
  layer_name = "${var.project_name}-dependencies"
  
  compatible_runtimes = ["nodejs22.x"]
  
  filename = "${path.module}/../../light-api/lambda-layer.zip"
  source_code_hash = filebase64sha256("${path.module}/../../light-api/lambda-layer.zip")
}

resource "aws_lambda_function" "loopback_api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "index.handler"
  runtime          = "nodejs22.x"
  
  # Use a placeholder zip file if the actual one doesn't exist
  filename         = local.lambda_zip_exists ? "${path.module}/../../light-api/lambda.zip" : "${path.module}/placeholder.zip"
  source_code_hash = local.source_code_hash
  
  # Increase memory and timeout for better performance
  memory_size      = 256
  timeout          = 30
  
  # Add publish = true to publish a version
  publish          = true
  
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
      
      # Add CORS configuration as environment variables
      CORS_ALLOWED_ORIGINS = join(",", compact([
        "http://localhost:3000", 
        var.cloudfront_domain != "" ? "https://${var.cloudfront_domain}" : ""
      ]))
      CORS_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH"
      CORS_ALLOWED_HEADERS = "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,on-behalf-of"
      CORS_EXPOSED_HEADERS = "Content-Type,Authorization,Retry-After,X-Rate-Limit-Exceeded,on-behalf-of"
      CORS_ALLOW_CREDENTIALS = "true"
      CORS_MAX_AGE = "300"
    }
  }
}

# Create a CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/${var.project_name}-api"
  retention_in_days = 14
}

# Replace HTTP API with REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "${var.project_name}-api"
  description = "REST API for ${var.project_name}"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Create a resource that matches all paths
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "{proxy+}"
}

# Create a catch-all method
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# Integrate with Lambda
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loopback_api.invoke_arn
}

# Create a method for the root path
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_rest_api.api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# Integrate root path with Lambda
resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_rest_api.api.root_resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.loopback_api.invoke_arn
}

# Create a deployment
resource "aws_api_gateway_deployment" "api" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.lambda_root,
    aws_api_gateway_integration_response.proxy_options,
    aws_api_gateway_integration_response.proxy_root_options,
    aws_api_gateway_gateway_response.cors
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  
  # Force a new deployment when routes change
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy.id,
      aws_api_gateway_method.proxy.id,
      aws_api_gateway_integration.lambda.id,
      aws_api_gateway_method.proxy_root.id,
      aws_api_gateway_integration.lambda_root.id,
      aws_api_gateway_method.proxy_options.id,
      aws_api_gateway_integration.proxy_options.id,
      aws_api_gateway_method_response.proxy_options.id,
      aws_api_gateway_integration_response.proxy_options.id,
      aws_api_gateway_method.proxy_root_options.id,
      aws_api_gateway_integration.proxy_root_options.id,
      aws_api_gateway_method_response.proxy_root_options.id,
      aws_api_gateway_integration_response.proxy_root_options.id,
    ]))
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# Create a stage with logging
resource "aws_api_gateway_stage" "api" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "api"
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      path           = "$context.path"
    })
  }
  
  # Ensure the CloudWatch role is set up before creating the stage
  depends_on = [aws_api_gateway_account.api_gateway_account]
}

# Now you can use the method settings
resource "aws_api_gateway_method_settings" "all" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.api.stage_name
  method_path = "*/*"

  settings {
    metrics_enabled        = true
    logging_level          = "INFO"
    data_trace_enabled     = true
    throttling_burst_limit = 5000
    throttling_rate_limit  = 10000
  }
}

# Add API policy
resource "aws_api_gateway_rest_api_policy" "api_policy" {
  rest_api_id = aws_api_gateway_rest_api.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "execute-api:Invoke"
        Resource = "${aws_api_gateway_rest_api.api.execution_arn}/*"
      }
    ]
  })
}

# Add caching
resource "aws_api_gateway_stage" "cached" {
  deployment_id = aws_api_gateway_deployment.api.id
  rest_api_id   = aws_api_gateway_rest_api.api.id
  stage_name    = "cached"

  cache_cluster_enabled = true
  cache_cluster_size    = "0.5" # 0.5GB cache

  variables = {
    "stageName" = "cached"
  }
}

# Add request validation
resource "aws_api_gateway_request_validator" "validator" {
  name                        = "payload-validator"
  rest_api_id                 = aws_api_gateway_rest_api.api.id
  validate_request_body       = true
  validate_request_parameters = true
}

# Update Lambda permission for REST API
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.loopback_api.function_name
  principal     = "apigateway.amazonaws.com"
  
  # The source ARN for the API Gateway
  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# WAF association for REST API
resource "aws_wafv2_web_acl_association" "api_waf_association" {
  resource_arn = aws_api_gateway_stage.api.arn
  web_acl_arn  = aws_wafv2_web_acl.api_waf.arn
}

# Output the REST API URL
output "rest_api_url" {
  value = "${aws_api_gateway_stage.api.invoke_url}"
}

# Add WAF for additional security
resource "aws_wafv2_web_acl" "api_waf" {
  name        = "${var.project_name}-api-waf"
  description = "WAF for API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 1000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ApiWaf"
    sampled_requests_enabled   = true
  }
}

# Fix for aws_lambda_provisioned_concurrency_config
# First, publish a version of the Lambda function
# resource "aws_lambda_function" "loopback_api_version" {
#   function_name    = "${var.project_name}-api-versioned"
#   role             = aws_iam_role.lambda_exec_role.arn
#   handler          = "index.handler"
#   runtime          = "nodejs22.x"
  
#   # Use the same code as the main function
#   filename         = local.lambda_zip_exists ? "${path.module}/../../light-api/lambda.zip" : "${path.module}/placeholder.zip"
#   source_code_hash = local.source_code_hash
  
#   # Same configuration as the main function
#   memory_size      = 256
#   timeout          = 30
  
#   # Publish a version
#   publish          = true
  
#   # Use the same environment variables
#   environment {
#     variables = {
#       USER_POOL_ID = var.user_pool_id
#       CLIENT_ID    = var.client_id
#       REGION       = var.aws_region
#       MONGODB_URI  = var.mongodb_uri
#       DEBUG        = "*"
#       NODE_ENV     = "production"
      
#       CORS_ALLOWED_ORIGINS = join(",", compact([
#         "http://localhost:3000", 
#         var.cloudfront_domain != "" ? "https://${var.cloudfront_domain}" : ""
#       ]))
#       CORS_ALLOWED_METHODS = "GET,POST,PUT,DELETE,OPTIONS,HEAD,PATCH"
#       CORS_ALLOWED_HEADERS = "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token"
#       CORS_EXPOSED_HEADERS = "Content-Type,Authorization"
#       CORS_ALLOW_CREDENTIALS = "true"
#       CORS_MAX_AGE = "300"
#     }
#   }
  
#   depends_on = [aws_cloudwatch_log_group.lambda_log_group]
# }

# Now configure provisioned concurrency on the published version
# resource "aws_lambda_provisioned_concurrency_config" "api_concurrency" {
#   function_name                     = aws_lambda_function.loopback_api_version.function_name
#   provisioned_concurrent_executions = 5
#   qualifier                         = aws_lambda_function.loopback_api_version.version
# }

# Add permission for API Gateway to invoke the versioned function
# resource "aws_lambda_permission" "api_gateway_versioned" {
#   statement_id  = "AllowAPIGatewayInvokeVersioned"
#   action        = "lambda:InvokeFunction"
#   function_name = aws_lambda_function.loopback_api_version.function_name
#   qualifier     = aws_lambda_function.loopback_api_version.version
#   principal     = "apigateway.amazonaws.com"
  
#   source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
# }

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-lambda-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "60"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "This metric monitors lambda function errors"
  
  dimensions = {
    FunctionName = aws_lambda_function.loopback_api.function_name
  }
  
  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-alerts"
}

# Add CORS configuration to the REST API
resource "aws_api_gateway_gateway_response" "cors" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  response_type = "DEFAULT_4XX"
  
  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin" = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,on-behalf-of'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
  }
  
  depends_on = [aws_api_gateway_rest_api.api]
}

# Add OPTIONS method to the proxy resource for CORS
resource "aws_api_gateway_method" "proxy_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "OPTIONS"
  authorization = "NONE"
  
  depends_on = [aws_api_gateway_resource.proxy]
}

# Add mock integration for OPTIONS method
resource "aws_api_gateway_integration" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  
  type = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
  
  depends_on = [aws_api_gateway_method.proxy_options]
}

# Add CORS headers to OPTIONS method response
resource "aws_api_gateway_method_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin" = true
  }
  
  depends_on = [aws_api_gateway_method.proxy_options]
}

# Add CORS headers to OPTIONS integration response
resource "aws_api_gateway_integration_response" "proxy_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy_options.http_method
  status_code = aws_api_gateway_method_response.proxy_options.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,on-behalf-of'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
  
  depends_on = [aws_api_gateway_method_response.proxy_options]
}

# Add OPTIONS method to the root resource for CORS
resource "aws_api_gateway_method" "proxy_root_options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_rest_api.api.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Add mock integration for OPTIONS method on root
resource "aws_api_gateway_integration" "proxy_root_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_rest_api.api.root_resource_id
  http_method = aws_api_gateway_method.proxy_root_options.http_method
  
  type = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Add CORS headers to OPTIONS method response on root
resource "aws_api_gateway_method_response" "proxy_root_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_rest_api.api.root_resource_id
  http_method = aws_api_gateway_method.proxy_root_options.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

# Add CORS headers to OPTIONS integration response on root
resource "aws_api_gateway_integration_response" "proxy_root_options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_rest_api.api.root_resource_id
  http_method = aws_api_gateway_method.proxy_root_options.http_method
  status_code = aws_api_gateway_method_response.proxy_root_options.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,on-behalf-of'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,PUT,DELETE,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin" = "'*'"
  }
}
