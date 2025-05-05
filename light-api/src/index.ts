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
        allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'on-behalf-of'],
        exposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(',') || ['Content-Type', 'Authorization', 'Retry-After', 'X-Rate-Limit-Exceeded','on-behalf-of'],
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