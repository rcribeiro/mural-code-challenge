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
  console.log('Incoming event:', JSON.stringify(event, null, 2));
  
  if (!serverlessExpressInstance) {
    serverlessExpressInstance = await bootstrap();
  }
  
  return serverlessExpressInstance(event, context);
};