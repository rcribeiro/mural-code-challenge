# LightLegal Terraform Infrastructure

This folder provisions the infrastructure for the **LightLegal** platform using:

- Amazon Cognito for authentication
- AWS Lambda + API Gateway for the backend
- MongoDB Atlas for data storage
- S3 + DynamoDB for storing Terraform remote state

---

## 📁 Project Structure

```
terraform/
├── main.tf             # Root module wiring all submodules
├── variables.tf        # Global input variables
├── outputs.tf          # Global output values
├── provider.tf         # AWS + MongoDB provider setup
├── auth/               # Cognito user pool setup
├── api/                # Lambda function and API Gateway setup
├── db/                 # MongoDB Atlas cluster setup
lightlegal-api/         # LoopBack 4 API source code
dist/                   # Build output directory
```

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
  bucket = "lightlegal-terraform-state"
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

Then run:

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

### 3. Building the API

Before deploying the infrastructure, you need to build and package the LoopBack API:

1. Build the LoopBack application:

```bash
cd lightlegal-api
npm install
npm run build
```

2. Create a deployment package:

```bash
npm run package
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

- `user_pool_id` – Cognito User Pool ID
- `user_pool_client_id` – Cognito App Client ID
- `api_gateway_url` – API Gateway public endpoint
- `mongodb_cluster_connection_string` – MongoDB URI for backend

---

## 🧾 Remote State Info

Terraform state is stored remotely to support team access and prevent conflicts:

- **S3 Bucket:** `lightlegal-terraform-state`
- **DynamoDB Table:** `terraform-locks`

---

## 🧼 Destroy the Infrastructure

If you want to clean everything up:

```bash
terraform destroy
```

> Warning: This will permanently delete all resources provisioned.

---

## 🧪 Testing the API

### Authentication

First, you need to create a user in the Cognito User Pool and obtain an access token:

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

Save the `IdToken` from the response.

### CRUD Operations

Use the following curl commands to test the API endpoints. Replace `YOUR_API_URL` with the API Gateway URL from the Terraform output and `YOUR_TOKEN` with the Cognito access token.

#### Create a Client

```bash
curl -X POST https://YOUR_API_URL/clients \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "Test Client",
    "email": "test@example.com"
  }'
```

#### Get All Clients

```bash
curl -X GET https://YOUR_API_URL/clients \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

#### Get a Specific Client

```bash
curl -X GET https://YOUR_API_URL/clients/CLIENT_ID \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

#### Update a Client

```bash
curl -X PATCH https://YOUR_API_URL/clients/CLIENT_ID \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "name": "Updated Client Name",
    "email": "updated@example.com"
  }'
```

#### Delete a Client

```bash
curl -X DELETE https://YOUR_API_URL/clients/CLIENT_ID \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## 🔍 Troubleshooting

### Lambda Logs

Check CloudWatch Logs for Lambda function errors:

```bash
aws logs get-log-events \
  --log-group-name /aws/lambda/lightlegal-api \
  --log-stream-name $(aws logs describe-log-streams --log-group-name /aws/lambda/lightlegal-api --order-by LastEventTime --descending --limit 1 --query 'logStreams[0].logStreamName' --output text)
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

The LightLegal API is built with LoopBack 4, a modern API framework for Node.js. Key components include:

1. **Models**: Define the data structures (e.g., Client model)
2. **Repositories**: Handle data access to MongoDB
3. **Controllers**: Implement the REST API endpoints
4. **Authentication**: Integration with Cognito for secure access

### Lambda Function Structure

The Lambda function uses a custom Express setup to properly handle API Gateway requests:

```typescript
import {APIGatewayProxyHandlerV2} from 'aws-lambda';
import {Express} from 'express';
import {LightlegalApiApplication} from './application';
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
  
  const lbApp = new LightlegalApiApplication({
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

