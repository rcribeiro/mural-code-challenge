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
├── scripts/                # Deployment and utility scripts
│   ├── create-admin.sh     # Script to create admin user
│   └── test-deployment.sh  # Script to test deployment
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

## 🚀 Serverless Deployment Optimizations

The Light API is optimized for serverless deployment on AWS Lambda with several performance enhancements:

### Cold Start Optimization
- Application initialization is moved outside the Lambda handler
- Lazy loading is implemented for heavy dependencies
- Provisioned Concurrency is configured for critical functions (*Provisioned concurrency has cost implications - you're paying for the reserved capacity whether it's used or not. Make sure this is what you want. The resources are commented out in Terraform*)

#### Ultra-small handler package  
The Lambda *handler* is now a single JavaScript file produced by `esbuild`
(tree-shaken, minified, externalising the AWS SDK and all other
dependencies).  

```
$ tree -h light-api/dist
dist
└─ index.js   160 KB   → 44 KB zipped (`lambda.zip`)
```

Because the payload AWS has to download / unzip is only a few-dozen KB,
the **init phase routinely finishes in <100 ms**, even on a cold start.

#### One shared dependency layer  
All production dependencies (`express`, `cors`, `body-parser`, LoopBack 4,
Mongo connector, etc.) are packaged once as a **Lambda Layer**:

```
$ du -h lambda-layer.zip
24 M  lambda-layer.zip
```

• The layer is **immutable & versioned** – when its hash changes
  Terraform publishes a new version and updates the function’s `layers`
  attribute.  
• The layer is **cached** inside the execution environment; after the
  first invocation subsequent cold starts in the same AZ do **not** have
  to download it again.  
• Splitting code vs. deps lets you iterate quickly (handler rebuild in
  seconds) while keeping the rarely-changing packages out of the critical
  path.

### Database Connection Management
- Connection pooling is optimized for Lambda's lifecycle
- Connections are reused across invocations
- Connection parameters are tuned for serverless environments:
  ```javascript
  {
    minPoolSize: 0,
    maxPoolSize: 10,
    maxIdleTimeMS: 270000, // Just under Lambda's 5-minute max timeout
    serverSelectionTimeoutMS: 5000
  }
  ```

### Response Optimization
- Pagination is implemented for large data responses
- API Gateway response compression is enabled
- Large responses use efficient data streaming

### Memory and Resource Management
- Lambda memory settings are optimized for performance/cost balance
- In-memory caching reduces database and API calls
- Provider instances are cached with TTL management

### Environment-Specific Configuration
- Configuration is loaded from AWS Parameter Store
- Environment variables control behavior without code changes
- Secrets are managed securely outside the codebase

### Deployment Strategy
- Webpack creates optimized deployment packages
- Lambda Layers separate dependencies from application code
- CI/CD pipeline automates the deployment process

### Monitoring and Reliability
- CloudWatch alarms monitor function performance
- Error handling is optimized for serverless context
- WAF protects against common web vulnerabilities

---

## 🚀 Deployment Instructions

### 1. Bootstrap Remote Backend (One-time Setup)

Before running the main Terraform project, you need to create an S3 bucket and DynamoDB table to store the remote state.

```bash
# Create a directory for the backend setup
mkdir -p terraform-backend
cd terraform-backend

# Create the main.tf file
cat > main.tf << 'EOF'
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
EOF

# Initialize and apply the Terraform configuration
terraform init
terraform apply -auto-approve

# Return to the project root
cd ..
```

---

### 2. Set Required Environment Variables

To authenticate with MongoDB Atlas, set the following variables in your terminal:

```bash
export TF_VAR_mongodb_org_id="your_org_id"
export TF_VAR_mongodb_public_key="your_public_key"
export TF_VAR_mongodb_private_key="your_private_key"
```

Or create a `terraform.tfvars` file in the `terraform` directory:

```bash
cd terraform
cat > terraform.tfvars << EOF
mongodb_org_id     = "your_org_id"
mongodb_public_key = "your_public_key"
mongodb_private_key = "your_private_key"
EOF
cd ..
```

---

### 3. Building the API and Frontend

Before deploying the infrastructure, you need to build both the backend and frontend applications:

1. Build the LoopBack API:

```bash
cd light-api
./deploy.sh
cd ..
```

2. Build the React frontend:

```bash
cd light-frontend
npm install
npm run build
cd ..
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

# Initialize Terraform with the remote backend
terraform init \
  -backend-config="bucket=light-terraform-state" \
  -backend-config="key=terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=terraform-locks"

# Plan the deployment to see what will be created
terraform plan

# Apply the configuration to create all resources
terraform apply

# Save the outputs for later use
terraform output > deployment_outputs.txt

cd ..
```

---

### 5. Deploy the Frontend to S3 and Configure CloudFront

After Terraform has created the S3 bucket and CloudFront distribution, deploy the frontend:

```bash
# Run the frontend deployment script
cd light-frontend
./deploy-frontend.sh
cd ..
```

The `deploy-frontend.sh` script handles:
1. Building the React application
2. Uploading the build to the S3 bucket
3. Invalidating the CloudFront cache

---

### 6. Create an Admin User

Create an admin user in the Cognito User Pool using the provided script:

```bash
# Make the script executable
chmod +x scripts/create-admin.sh

# Run the script
./scripts/create-admin.sh
```

The script will:
1. Extract User Pool ID and Client ID from Terraform outputs
2. Create a user with admin privileges
3. Confirm the user (bypassing email verification)

---

### 7. Test the Deployment

Test the deployment using the provided script:

```bash
# Make the script executable
chmod +x scripts/test-deployment.sh

# Run the script
./scripts/test-deployment.sh
```

The script will:
1. Get the CloudFront domain from Terraform outputs
2. Obtain an authentication token from Cognito
3. Test API endpoints to verify functionality

---

### 8. Outputs You'll Receive

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
    "providerType": "mural",
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
# Navigate to the Terraform directory
cd terraform

# Destroy all resources
terraform destroy

# Return to the project root
cd ..

# Clean up the Terraform backend
cd terraform-backend
terraform destroy
cd ..
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

Verify the MongoDB connection string in the Lambda environment variables:

```bash
aws lambda get-function-configuration --function-name light-api --query "Environment.Variables.MONGODB_URI"
```

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
import express, {Express} from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {LightApiApplication} from './application';
import serverlessExpress from '@vendia/serverless-express';
import {getConfig} from './config';

// Initialize Express app outside the handler
const expressApp = express();

// Lazy-loaded application promise
let lbAppPromise: Promise<LightApiApplication> | null = null;
let serverlessExpressInstance: any = null;
let configPromise: Promise<any> | null = null;

// Function to get or initialize the configuration
const getAppConfig = async () => {
  if (!configPromise) {
    configPromise = getConfig();
  }
  return configPromise;
};

// Function to get or initialize the LoopBack application
const getLbApp = async (): Promise<LightApiApplication> => {
  if (!lbAppPromise) {
    lbAppPromise = (async () => {
      console.log('Initializing LoopBack application...');
      
      // Get configuration
      const config = await getAppConfig();
      
      // Set debug level from config
      if (config.debug_level) {
        process.env.DEBUG = config.debug_level;
      }
      
      // Configure CORS
      const corsOptions = {
        origin: config.cors_allowed_origins?.split(',') || ['http://localhost:3000'],
        methods: process.env.CORS_ALLOWED_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
        exposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
        credentials: process.env.CORS_ALLOW_CREDENTIALS === 'true',
        maxAge: parseInt(process.env.CORS_MAX_AGE || '300'),
      };
      
      // Apply middleware to Express app
      expressApp.use(cors(corsOptions));
      expressApp.use(bodyParser.json());
      expressApp.use(bodyParser.urlencoded({ extended: true }));
      
      const app = new LightApiApplication({
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
          cors: false,
          requestBodyParser: {
            json: false,
            text: false,
            urlencoded: false,
          },
        },
      });
      
      await app.boot();
      await app.start();
      console.log('LoopBack application initialized successfully');
      return app;
    })();
  }
  return lbAppPromise;
};

// Initialize the serverless express instance
const getServerlessExpressInstance = async () => {
  if (!serverlessExpressInstance) {
    const lbApp = await getLbApp();
    
    // Mount the LoopBack app on the Express app
    expressApp.use((req, res) => {
      lbApp.requestHandler(req, res);
    });
    
    serverlessExpressInstance = serverlessExpress({
      app: expressApp,
      binarySettings: {
        isBinary: () => false,
      }
    });
  }
  return serverlessExpressInstance;
};

// Warm up the application during container initialization
if (process.env.AWS_LAMBDA_INITIALIZATION_TYPE === 'provisioned-concurrency') {
  console.log('Provisioned concurrency initialization - warming up application');
  getServerlessExpressInstance().catch(err => {
    console.error('Error during warm-up:', err);
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  // Set remaining time logging
  const timeRemaining = () => Math.ceil((context.getRemainingTimeInMillis() / 1000));
  
  try {
    console.log(`Handler invoked with ${timeRemaining()}s remaining`);
    console.log('Incoming event:', JSON.stringify(event));
    
    const instance = await getServerlessExpressInstance();
    return instance(event, context);
  } catch (error) {
    console.error(`Error with ${timeRemaining()}s remaining:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
```

## 📚 Additional Resources

- [LoopBack 4 Documentation](https://loopback.io/doc/en/lb4/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Cognito User Pools Documentation](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
