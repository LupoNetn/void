import { Test, TestingModule } from '@nestjs/testing';
import { ProviderCredentialsService } from './provider-credentials.service.js';

describe('ProviderCredentialsService', () => {
  let service: ProviderCredentialsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProviderCredentialsService],
    }).compile();

    service = module.get<ProviderCredentialsService>(ProviderCredentialsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
