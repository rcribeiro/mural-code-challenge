import {APIGatewayProxyHandlerV2} from 'aws-lambda';
import express, {Express} from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import {LightApiApplication} from './application';
import serverlessExpress from '@vendia/serverless-express';

let serverlessExpressInstance: any;

async function bootstrap() {
  // Create a custom Express app that will handle the body parsing before LoopBack
  const expressApp = express();
  
  // Configure CORS with explicit origin configuration
  const corsOptions = {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: process.env.CORS_ALLOWED_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
    exposedHeaders: process.env.CORS_EXPOSED_HEADERS?.split(',') || ['Content-Type', 'Authorization'],
    credentials: process.env.CORS_ALLOW_CREDENTIALS === 'true',
    maxAge: parseInt(process.env.CORS_MAX_AGE || '300'),
  };
  
  // Apply CORS middleware to Express
  expressApp.use(cors(corsOptions));
  
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
      // Disable LoopBack's built-in CORS since we're handling it in Express
      cors: false,
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
  expressApp.use((req, res) => {
    lbApp.requestHandler(req, res);
  });

  return serverlessExpress({
    app: expressApp,
    binarySettings: {
      isBinary: () => false,
    }
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  console.log('Incoming event:', JSON.stringify(event));
  
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = await bootstrap();
  }
  
  return serverlessExpressInstance(event, context);
};