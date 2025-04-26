import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {IntegrationCredential} from '../models';
import {IntegrationCredentialRepository} from '../repositories';
import {authenticate} from '@loopback/authentication';

export class IntegrationCredentialController {
  constructor(
    @repository(IntegrationCredentialRepository)
    public integrationCredentialRepository: IntegrationCredentialRepository,
  ) {}

  @authenticate('cognito')
  @post('/integration-credentials')
  @response(200, {
    description: 'IntegrationCredential model instance',
    content: {'application/json': {schema: getModelSchemaRef(IntegrationCredential)}},
  })
  async create(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(IntegrationCredential, {
            title: 'NewIntegrationCredential',
            exclude: ['id'],
          }),
        },
      },
    })
    integrationCredential: Omit<IntegrationCredential, 'id'>,
  ): Promise<IntegrationCredential> {
    return this.integrationCredentialRepository.create(integrationCredential);
  }

  @authenticate('cognito')
  @get('/integration-credentials/count')
  @response(200, {
    description: 'IntegrationCredential model count',
    content: {'application/json': {schema: CountSchema}},
  })
  async count(
    @param.where(IntegrationCredential) where?: Where<IntegrationCredential>,
  ): Promise<Count> {
    return this.integrationCredentialRepository.count(where);
  }

  @authenticate('cognito')
  @get('/integration-credentials')
  @response(200, {
    description: 'Array of IntegrationCredential model instances',
    content: {
      'application/json': {
        schema: {
          type: 'array',
          items: getModelSchemaRef(IntegrationCredential, {includeRelations: true}),
        },
      },
    },
  })
  async find(
    @param.filter(IntegrationCredential) filter?: Filter<IntegrationCredential>,
  ): Promise<IntegrationCredential[]> {
    return this.integrationCredentialRepository.find(filter);
  }

  @authenticate('cognito')
  @patch('/integration-credentials')
  @response(200, {
    description: 'IntegrationCredential PATCH success count',
    content: {'application/json': {schema: CountSchema}},
  })
  async updateAll(
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(IntegrationCredential, {partial: true}),
        },
      },
    })
    integrationCredential: IntegrationCredential,
    @param.where(IntegrationCredential) where?: Where<IntegrationCredential>,
  ): Promise<Count> {
    return this.integrationCredentialRepository.updateAll(integrationCredential, where);
  }

  @authenticate('cognito')
  @get('/integration-credentials/{id}')
  @response(200, {
    description: 'IntegrationCredential model instance',
    content: {
      'application/json': {
        schema: getModelSchemaRef(IntegrationCredential, {includeRelations: true}),
      },
    },
  })
  async findById(
    @param.path.string('id') id: string,
    @param.filter(IntegrationCredential, {exclude: 'where'}) filter?: FilterExcludingWhere<IntegrationCredential>
  ): Promise<IntegrationCredential> {
    return this.integrationCredentialRepository.findById(id, filter);
  }

  @authenticate('cognito')
  @patch('/integration-credentials/{id}')
  @response(204, {
    description: 'IntegrationCredential PATCH success',
  })
  async updateById(
    @param.path.string('id') id: string,
    @requestBody({
      content: {
        'application/json': {
          schema: getModelSchemaRef(IntegrationCredential, {partial: true}),
        },
      },
    })
    integrationCredential: IntegrationCredential,
  ): Promise<void> {
    await this.integrationCredentialRepository.updateById(id, integrationCredential);
  }

  @authenticate('cognito')
  @put('/integration-credentials/{id}')
  @response(204, {
    description: 'IntegrationCredential PUT success',
  })
  async replaceById(
    @param.path.string('id') id: string,
    @requestBody() integrationCredential: IntegrationCredential,
  ): Promise<void> {
    await this.integrationCredentialRepository.replaceById(id, integrationCredential);
  }

  @authenticate('cognito')
  @del('/integration-credentials/{id}')
  @response(204, {
    description: 'IntegrationCredential DELETE success',
  })
  async deleteById(@param.path.string('id') id: string): Promise<void> {
    await this.integrationCredentialRepository.deleteById(id);
  }
}