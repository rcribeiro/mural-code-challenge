import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import debugFactory from 'debug';

const debug = debugFactory('api-core:config');

interface AppConfig {
  debug_level: string;
  cors_allowed_origins: string;
  mongodb_connection_options: {
    minPoolSize: number;
    maxPoolSize: number;
    maxIdleTimeMS: number;
    serverSelectionTimeoutMS: number;
  };
  // Add other configuration properties as needed
}

let cachedConfig: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  // Use environment variables as defaults
  const defaultConfig: AppConfig = {
    debug_level: process.env.DEBUG || 'error',
    cors_allowed_origins: process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000',
    mongodb_connection_options: {
      minPoolSize: 0,
      maxPoolSize: 10,
      maxIdleTimeMS: 270000,
      serverSelectionTimeoutMS: 5000,
    },
  };

  // If not running in AWS or no config path specified, use defaults
  if (!process.env.CONFIG_PATH || process.env.NODE_ENV === 'development') {
    debug('Using default configuration');
    cachedConfig = defaultConfig;
    return defaultConfig;
  }

  try {
    debug(`Loading configuration from Parameter Store: ${process.env.CONFIG_PATH}`);
    const ssm = new SSMClient({ region: process.env.REGION || 'us-east-1' });
    
    const { Parameter } = await ssm.send(new GetParameterCommand({
      Name: process.env.CONFIG_PATH!,
      WithDecryption: true,
    }));
    
    if (Parameter?.Value) {
      const loadedConfig = JSON.parse(Parameter.Value) as Partial<AppConfig>;
      
      // Merge with defaults
      cachedConfig = {
        ...defaultConfig,
        ...loadedConfig,
        mongodb_connection_options: {
          ...defaultConfig.mongodb_connection_options,
          ...(loadedConfig.mongodb_connection_options || {}),
        },
      };
      
      debug('Configuration loaded successfully');
      return cachedConfig;
    }
    
    debug('No configuration found in Parameter Store, using defaults');
    cachedConfig = defaultConfig;
    return defaultConfig;
  } catch (error) {
    debug('Error loading configuration from Parameter Store:', error);
    debug('Falling back to default configuration');
    cachedConfig = defaultConfig;
    return defaultConfig;
  }
}