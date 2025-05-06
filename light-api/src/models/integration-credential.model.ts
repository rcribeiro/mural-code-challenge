import { Entity, model, property, belongsTo } from '@loopback/repository';

@model({
  settings: {
    indexes: {
      uniqueProviderCredentials: {
        keys: {
          providerType: 1,
          'credentials.baseUrl': 1,
          'credentials.apiKey': 1,
        },
        options: {
          unique: true,
        },
      },
    },
  },
})
export class IntegrationCredential extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  providerType: string;

  @property({
    type: 'string',
    required: true,
  })
  accountIdentifier: string;

  @property({
    type: 'object',
    required: true,
    jsonSchema: {
      properties: {
        baseUrl: { type: 'string' },
        apiKey: { type: 'string' },
        transferApiKey: { type: 'string' },
        // Add other common properties here
      },
    },
  })
  credentials: {
    baseUrl?: string;
    apiKey?: string;
    transferApiKey?: string;
    [key: string]: any; // Flexible for different provider requirements
  };

  @property({
    type: 'date',
    default: () => new Date(),
  })
  createdAt?: Date;

  @property({
    type: 'date',
    default: () => new Date(),
  })
  updatedAt?: Date;

  @property({
    type: 'date',
    required: false,
    jsonSchema: {
      description: 'Expiry date for the credential',
    },
  })
  expiryDate?: Date;

  // Audit fields
  @property({
    type: 'string',
  })
  createdBy?: string;

  @property({
    type: 'string',
  })
  updatedBy?: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      title: 'Version',
      type: 'string',
    },
  })
  version: string;

  @property({
    type: 'boolean',
    required: true,
    jsonSchema: {
      title: 'Automatic Update',
      type: 'boolean',
    },
  })
  automaticUpdate: boolean;

  constructor(data?: Partial<IntegrationCredential>) {
    super(data);
  }
}

export interface IntegrationCredentialRelations {
  // describe navigational properties here
}

export type IntegrationCredentialWithRelations = IntegrationCredential & IntegrationCredentialRelations;
