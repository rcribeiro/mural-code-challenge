# Mural Light: Serverless Payment Management Platform

This repository contains the infrastructure and application code for **Mural Light**, a modern serverless payment management platform built with:

- **Frontend**: React + TypeScript (Single-Page Application)
- **Backend**: AWS Lambda + API Gateway with LoopBack 4
- **Authentication**: Amazon Cognito
- **Database**: MongoDB Atlas (serverless)
- **Infrastructure**: Terraform IaC (Infrastructure as Code)
- **CDN**: Amazon CloudFront for global content delivery

Mural Light demonstrates a complete serverless architecture that scales automatically, follows pay-per-use pricing, and requires minimal operational overhead.

---

## 📁 Project Structure

```
mural-light/
├── terraform/              # Infrastructure as Code
│   ├── main.tf             # Root module wiring all submodules
│   ├── variables.tf        # Global input variables
│   ├── outputs.tf          # Global output values
│   ├── provider.tf         # AWS + MongoDB provider setup
│   ├── auth/               # Cognito user pool setup
│   ├── api/                # Lambda function and API Gateway setup
│   ├── db/                 # MongoDB Atlas cluster setup
│   └── frontend/           # S3 + CloudFront distribution setup
├── light-api/              # LoopBack 4 API source code
│   ├── src/                # API source files
│   ├── dist/               # Build output directory
│   └── package.json        # Node.js dependencies
├── light-frontend/         # React frontend application
│   ├── src/                # React components and logic
│   ├── public/             # Static assets
│   └── package.json        # Node.js dependencies
├── deploy.sh               # Deployment automation script
└── README.md               # This documentation
```

---

## 🌟 Key Features

- **Fully Serverless Architecture**: Zero server management with automatic scaling
- **Real-time Currency Conversion**: Integration with external exchange rate API
- **Secure Authentication**: Enterprise-grade identity management via Cognito
- **Global Content Delivery**: CloudFront CDN for low-latency worldwide access
- **Infrastructure as Code**: Complete Terraform automation for consistent deployments
- **Cost Optimization**: Resources scale to zero during periods of inactivity
- **Document Database**: Flexible data model with MongoDB Atlas

---

## 🚀 Deployment Instructions

### 1. Bootstrap Remote Backend (One-time Setup)

Before running the main Terraform project, you need to create an S3 bucket and DynamoDB table to store the remote state.

Create a folder `terraform-backend` and add a file `main.tf` with:

```hcl
provider "aws" {
  profile = "personal"
  region  = "us-east-1"
}

resource "aws_s3_bucket" "tf_state" {
  bucket = "light-terraform-state"
  force_destroy = true

  versioning {
    enabled = true
  }

  tags = {
    Name = "Terraform State Bucket"
  }
}

resource "aws_dynamodb_table" "tf_locks" {
  name         = "terraform-locks"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name = "Terraform Lock Table"
  }
}
```

Go to the `terraform-backend` folder and run:

```bash
terraform init
terraform apply
```

---

### 2. Set Required Environment Variables

To authenticate with MongoDB Atlas, set the following variables in your terminal:

```bash
export TF_VAR_mongodb_org_id="your_org_id"
export TF_VAR_mongodb_public_key="your_public_key"
export TF_VAR_mongodb_private_key="your_private_key"
```

Or use a `.tfvars` file with the same keys.

---

### 3. Building the API and Frontend

Before deploying the infrastructure, you need to build both the backend and frontend applications:

1. Build the LoopBack API:

```bash
cd light-api
npm install
npm run build
```

2. Build the React frontend:

```bash
cd light-frontend
npm install
npm run build
```

Alternatively, use the deployment script which handles both builds:

```bash
./deploy.sh
```

---

### 4. Deploy the Infrastructure

Go to the main project folder and run:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

---

### 5. Outputs You'll Receive

After successful deployment, you'll get these important outputs:

- `user_pool_id` – Cognito User Pool ID
- `user_pool_client_id` – Cognito App Client ID
- `api_gateway_url` – API Gateway public endpoint
- `mongodb_cluster_connection_string` – MongoDB URI for backend
- `cloudfront_distribution_domain` – Your frontend application URL

---

## 🧾 Remote State Info

Terraform state is stored remotely to support team access and prevent conflicts:

- **S3 Bucket:** `light-terraform-state`
- **DynamoDB Table:** `terraform-locks`

---

## 🧪 Testing the Application

### 1. Register a New User

Visit the CloudFront URL from the Terraform outputs and register a new user. You'll receive a verification code via email.

### 2. Log In and Explore

After verifying your account, log in to explore the payment management interface:
- Create and manage payment integrations
- View transaction history
- Convert currencies using real-time exchange rates

### 3. API Testing

For direct API testing, use the following curl commands. Replace `YOUR_API_URL` with the API Gateway URL from the Terraform output and `YOUR_TOKEN` with the Cognito access token.

#### Authentication

1. Create a user:

```bash
aws cognito-idp sign-up \
  --client-id $(terraform output -raw user_pool_client_id) \
  --username your-username \
  --password your-password \
  --user-attributes Name=email,Value=your-email@example.com
```

2. Confirm the user:

```bash
aws cognito-idp admin-confirm-sign-up \
  --user-pool-id $(terraform output -raw user_pool_id) \
  --username your-username
```

3. Get an access token:

```bash
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id $(terraform output -raw user_pool_client_id) \
  --auth-parameters USERNAME=your-username,PASSWORD=your-password
```

#### CRUD Operations

Test the API endpoints with the following curl commands:

#### Create an Integration Credential

```bash
curl -X POST https://YOUR_API_URL/integration-credentials \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "providerType": "meow",
    "accountIdentifier": "account123",
    "credentials": {
      "baseUrl": "https://api.example.com",
      "apiKey": "your-api-key-123",
      "transferApiKey": "transfer-key-456"
    }
  }'
```

#### Get All Integration Credentials

```bash
curl -X GET https://YOUR_API_URL/integration-credentials \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## 🧼 Cleaning Up

If you want to clean everything up:

```bash
terraform destroy
```

> Warning: This will permanently delete all resources provisioned.

---

## 🔍 Architecture Overview

### Frontend Architecture

The React frontend implements:
- **Component-based UI**: Reusable UI elements for consistent design
- **State Management**: Efficient data flow and component updates
- **Responsive Design**: Mobile-first approach for all screen sizes
- **Authentication Flow**: Seamless integration with Cognito
- **API Integration**: Secure communication with the backend

### Backend Architecture

The LoopBack 4 API provides:
- **RESTful Endpoints**: Clean API design following REST principles
- **Data Validation**: Input validation and error handling
- **Authentication Middleware**: Cognito token verification
- **MongoDB Integration**: Document-based data persistence
- **External API Integration**: Currency conversion service

### Infrastructure Architecture

The serverless architecture eliminates the need for server provisioning while providing enterprise-grade scalability:

- **Frontend**: Static assets hosted on S3, distributed via CloudFront CDN
- **API Layer**: Lambda functions exposed through API Gateway
- **Authentication**: Cognito user pools for identity management
- **Database**: MongoDB Atlas serverless cluster
- **State Management**: Terraform state in S3 with DynamoDB locking

This architecture delivers enterprise-grade functionality without traditional infrastructure costs, making it ideal for payment processing at any scale.

---

## 🔍 Troubleshooting

### Lambda Logs

Check CloudWatch Logs for Lambda function errors:

```bash
aws logs get-log-events \
  --log-group-name /aws/lambda/light-api \
  --log-stream-name $(aws logs describe-log-streams --log-group-name /aws/lambda/light-api --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text)
```

### API Gateway Logs

Enable and check API Gateway execution logs in CloudWatch.

### MongoDB Connection

Verify the MongoDB connection string in the Lambda environment variables.

---

## 🔍 Troubleshooting

### Lambda Logs

Check CloudWatch Logs for Lambda function errors:

```bash
aws logs get-log-events \
  --log-group-name /aws/lambda/light-api \
  --log-stream-name $(aws logs describe-log-streams --log-group-name /aws/lambda/light-api --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text)
```

### API Gateway Logs

Enable and check API Gateway execution logs in CloudWatch.

### MongoDB Connection

Verify the MongoDB connection string in the Lambda environment variables.

---

## 🔜 Next Steps

- Connect to the MongoDB Atlas URI
- Use the API Gateway endpoint in your frontend
- Implement additional API endpoints for your business logic

## 📝 Development Notes

- The API uses the `@vendia/serverless-express` library to adapt the LoopBack application to AWS Lambda.
- Authentication is handled by Amazon Cognito and integrated with LoopBack using a custom authentication strategy.
- MongoDB Atlas is used as the database, with connection details passed to the Lambda function as environment variables.

### API Implementation Details

The Light API is built with LoopBack 4, a modern API framework for Node.js. Key components include:

1. **Models**: Define the data structures (e.g., IntegrationCredential model)
2. **Repositories**: Handle data access to MongoDB
3. **Controllers**: Implement the REST API endpoints
4. **Authentication**: Integration with Cognito for secure access

### Lambda Function Structure

The Lambda function uses a custom Express setup to properly handle API Gateway requests:

```typescript
import {APIGatewayProxyHandlerV2} from 'aws-lambda';
import {Express} from 'express';
import {LightApiApplication} from './application';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';
import bodyParser from 'body-parser';

let serverlessExpressInstance: any;

async function bootstrap() {
  // Create a custom Express app that will handle the body parsing before LoopBack
  const expressApp = express();
  
  // Add body parsing middleware
  expressApp.use(bodyParser.json());
  expressApp.use(bodyParser.urlencoded({ extended: true }));
  
  const lbApp = new LightApiApplication({
    rest: {
      port: 0,
      host: '127.0.0.1',
      openApiSpec: {
        setServersFromRequest: true,
      },
      expressSettings: {
        'x-powered-by': false,
        'trust proxy': true,
      },
      // Disable LoopBack's built-in body parsing since we're doing it in Express
      requestBodyParser: {
        json: false,
        text: false,
        urlencoded: false,
      },
    },
  });

  await lbApp.boot();
  await lbApp.start();

  // Mount the LoopBack app on the Express app
  expressApp.use((req, res, next) => {
    lbApp.requestHandler(req, res, next);
  });

  return serverlessExpress({
    app: expressApp,
    binarySettings: {
      isBinary: () => false,
    }
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.log('Incoming event:', JSON.stringify(event, null, 2));
  
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = await bootstrap();
  }
  
  return serverlessExpressInstance(event, context);
};
```

## 📚 Additional Resources

- [LoopBack 4 Documentation](https://loopback.io/doc/en/lb4/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Cognito User Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
