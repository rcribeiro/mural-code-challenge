import { inject, BindingScope, injectable } from '@loopback/core';
import { ANY, repository, Where } from '@loopback/repository';
import { HttpErrors } from '@loopback/rest';
import { IntegrationCredentialRepository } from '../repositories/integration-credential.repository';
import { MuralProvider } from './mural-provider.service';
import debugFactory from 'debug';
import { IntegrationCredential } from '../models/integration-credential.model';

const debug = debugFactory('api-core:service:provider-factory');

@injectable({ scope: BindingScope.SINGLETON })
export class ProviderFactoryService {
  constructor(
    @repository(IntegrationCredentialRepository)
    private credentialRepository: IntegrationCredentialRepository,
  ) { }


  async getMuralProvider(accountIdentifier: string): Promise<MuralProvider> {
  
    // Define the where clause with explicit typing
    const whereClause: Where<IntegrationCredential> = {
      providerType: 'mural',
      accountIdentifier,
    };

    const credential = await this.credentialRepository.findOne({
      where: whereClause,
    });
  
    if (!credential) {
      throw new HttpErrors.NotFound(
        `No Mural credentials found for account ${accountIdentifier}`,
      );
    }
  
    if (!credential.credentials.baseUrl || !credential.credentials.apiKey) {
      throw new HttpErrors.NotFound(
        `Invalid Mural credentials for account ${accountIdentifier}`,
      );
    }
  
    // Check if the credential is expired
    if (credential.expiryDate && new Date(credential.expiryDate) < new Date()) {
      throw new HttpErrors.Forbidden(
        `Mural credentials for account ${accountIdentifier} have expired. Please update your credentials.`,
      );
    }
  
    // Create a new instance of MuralProvider with the specific credentials
    const provider = new MuralProvider();
  
    // Initialize with specific account credentials
    provider.initialize({
      baseUrl: credential.credentials.baseUrl,
      apiKey: credential.credentials.apiKey,
      transferApiKey: credential.credentials.transferApiKey,
    });
  
    return provider;
  }
}