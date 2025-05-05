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
  // Cache for providers to reduce initialization overhead
  private providerCache: Map<string, { provider: MuralProvider, timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    @repository(IntegrationCredentialRepository)
    private credentialRepository: IntegrationCredentialRepository,
  ) { }

  async getMuralProvider(accountIdentifier: string): Promise<MuralProvider> {
    // Check cache first
    const cachedEntry = this.providerCache.get(accountIdentifier);
    const now = Date.now();
    
    if (cachedEntry && (now - cachedEntry.timestamp) < this.CACHE_TTL) {
      debug(`Using cached provider for account ${accountIdentifier}`);
      return cachedEntry.provider;
    }
  
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
    
    // Cache the provider
    this.providerCache.set(accountIdentifier, { provider, timestamp: now });
  
    return provider;
  }
  
  // Method to clear cache for testing or manual cache management
  clearProviderCache(accountIdentifier?: string): void {
    if (accountIdentifier) {
      this.providerCache.delete(accountIdentifier);
    } else {
      this.providerCache.clear();
    }
  }
}