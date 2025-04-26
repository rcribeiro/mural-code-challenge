import {inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {MongoDataSource} from '../datasources';
import {IntegrationCredential, IntegrationCredentialRelations} from '../models';

export class IntegrationCredentialRepository extends DefaultCrudRepository<
  IntegrationCredential,
  typeof IntegrationCredential.prototype.id,
  IntegrationCredentialRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: MongoDataSource,
  ) {
    super(IntegrationCredential, dataSource);
  }
}